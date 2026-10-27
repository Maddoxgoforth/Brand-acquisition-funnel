import "server-only";

type Row = Record<string, unknown>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS crm_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL,
    name text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    phone_e164 text,
    email text NOT NULL DEFAULT '',
    extra jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'new',
    notes text NOT NULL DEFAULT '',
    call_count integer NOT NULL DEFAULT 0,
    last_called_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Running count of the order leads were added in, including their order
  // inside one import. Dial lists are worked oldest-first by this.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS seq bigserial`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS appointment_at timestamptz`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS appointment_tz text`,
  // Optional link to a recording of the closing call (Loom, Drive, Fathom…).
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS recording_url text`,
  // Speed to lead: when someone first called the lead or moved it out of
  // To dial. Backfilled from history for leads worked before this existed.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_contact_at timestamptz`,
  // Free-course leads who opt in again: how many times in total, and when the
  // latest one was. The speed-to-lead timer restarts from the latest opt-in.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS opt_in_count integer NOT NULL DEFAULT 1`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_opt_in_at timestamptz`,
  // Ad tracking for opt-ins: utm_* params, fbclid, Meta's _fbc/_fbp browser
  // ids, IP and user agent (the last four are only used server-side, to send
  // conversions to Meta's Conversions API).
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb`,
  // Who is working the lead: set by their first call, or by Claim in the
  // lead panel. Name is copied so it still shows if the account is removed.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS claimed_by_id text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS claimed_by_name text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS claimed_at timestamptz`,
  `UPDATE crm_leads l SET first_contact_at = e.first
   FROM (SELECT lead_id, min(created_at) AS first FROM crm_events
         WHERE type IN ('call', 'status') GROUP BY lead_id) e
   WHERE l.id = e.lead_id AND l.first_contact_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS crm_leads_source_idx ON crm_leads (source, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS crm_leads_phone_idx ON crm_leads (phone_e164)`,
  `CREATE TABLE IF NOT EXISTS crm_events (
    id bigserial PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
    type text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS crm_events_lead_idx ON crm_events (lead_id, created_at DESC)`,
  // Who did it: "owner", a crm_users id, or "website"/"webhook" for leads
  // that came in on their own. Name is copied so history survives deletes.
  `ALTER TABLE crm_events ADD COLUMN IF NOT EXISTS actor_id text`,
  `ALTER TABLE crm_events ADD COLUMN IF NOT EXISTS actor_name text`,
  `CREATE INDEX IF NOT EXISTS crm_events_type_idx ON crm_events (type, created_at DESC)`,
  // First-party page tracking for the dashboard's funnel numbers: one row per
  // visitor per funnel step (see /api/track). No personal data.
  `CREATE TABLE IF NOT EXISTS site_events (
    id bigserial PRIMARY KEY,
    visitor_id text NOT NULL,
    funnel text NOT NULL,
    step text NOT NULL,
    campaign text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS site_events_funnel_idx ON site_events (funnel, step, created_at DESC)`,
  // Team accounts. status: pending (signed up, waiting for the owner),
  // active, or disabled (access removed).
  `CREATE TABLE IF NOT EXISTS crm_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL DEFAULT '',
    password_hash text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
  )`,
  // Which parts of the CRM this person can see (set by the owner).
  `ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS can_applications boolean NOT NULL DEFAULT true`,
  `ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS can_dial boolean NOT NULL DEFAULT true`,
];

export class CrmDbNotConfiguredError extends Error {
  constructor() {
    super(
      "CRM database is not configured. Set DATABASE_URL (see .env.example)."
    );
    this.name = "CrmDbNotConfiguredError";
  }
}

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDbConfigured() {
  return Boolean(connectionString()) || process.env.NODE_ENV !== "production";
}

async function connect(): Promise<QueryFn> {
  const url = connectionString();
  let run: QueryFn;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    run = async (text, params = []) => (await sql.query(text, params)) as Row[];
  } else if (process.env.NODE_ENV !== "production") {
    // Local development only: an embedded Postgres stored in ./.crm-dev-db so
    // `npm run dev` works without a Neon account. Never used on Vercel.
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite("./.crm-dev-db");
    run = async (text, params = []) =>
      (await db.query(text, params)).rows as Row[];
  } else {
    throw new CrmDbNotConfiguredError();
  }

  for (const statement of SCHEMA) await run(statement);
  return run;
}

// Cached on globalThis so dev hot-reloads and warm serverless invocations
// reuse one connection and run the schema statements once.
const globalForCrm = globalThis as unknown as {
  crmQuery?: Promise<QueryFn>;
};

export async function query<T = Row>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!globalForCrm.crmQuery) {
    globalForCrm.crmQuery = connect().catch((error) => {
      globalForCrm.crmQuery = undefined;
      throw error;
    });
  }
  const run = await globalForCrm.crmQuery;
  return (await run(text, params)) as T[];
}
