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
  // Closes: plan (monthly / yearly), what it's worth, when and by whom.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS close_plan text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS close_amount integer`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS closed_at timestamptz`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS closed_by_id text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS closed_by_name text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS payment_proof_id uuid`,
  // Closes from before these columns: when and by whom, from the history.
  `UPDATE crm_leads l
   SET closed_at = c.created_at, closed_by_id = c.actor_id, closed_by_name = c.actor_name
   FROM (SELECT DISTINCT ON (lead_id) lead_id, actor_id, actor_name, created_at
         FROM crm_events WHERE type = 'status' AND data->>'to' = 'closed'
         ORDER BY lead_id, created_at DESC) c
   WHERE l.id = c.lead_id AND l.status = 'closed' AND l.closed_at IS NULL`,
  // Payment screenshots for closes (small JPEGs, resized in the browser).
  `CREATE TABLE IF NOT EXISTS crm_payment_proofs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES crm_leads (id) ON DELETE CASCADE,
    mime text NOT NULL,
    data bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Leads worked before claiming existed go to whoever called them first
  // (skipping any lead with claim history, so a release stays released).
  `UPDATE crm_leads l
   SET claimed_by_id = c.actor_id, claimed_by_name = c.actor_name, claimed_at = c.created_at
   FROM (SELECT DISTINCT ON (lead_id) lead_id, actor_id, actor_name, created_at
         FROM crm_events WHERE type = 'call' AND actor_id IS NOT NULL
         ORDER BY lead_id, created_at) c
   WHERE l.id = c.lead_id AND l.claimed_by_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM crm_events x WHERE x.lead_id = l.id AND x.type = 'claim')`,
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
  // Commission rates per team member, kept as a history so a new rate only
  // changes closes from then on. effective_from NULL = applies to every
  // close before the next rate (used for the first rate and "apply to past
  // closes too"). See pay.ts.
  `CREATE TABLE IF NOT EXISTS crm_commission_rates (
    id bigserial PRIMARY KEY,
    user_id text NOT NULL,
    monthly integer NOT NULL DEFAULT 0,
    yearly integer NOT NULL DEFAULT 0,
    effective_from timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS crm_commission_rates_user_idx ON crm_commission_rates (user_id)`,
  // Bounties the owner posts for the team: the next `target` closes (of a
  // plan) by team members pay `amount` commission each, instead of
  // (mode 'replace') or on top of (mode 'extra') the normal rate.
  `CREATE TABLE IF NOT EXISTS crm_bounties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    plan text NOT NULL DEFAULT 'yearly',
    target integer NOT NULL,
    amount integer NOT NULL,
    mode text NOT NULL DEFAULT 'replace',
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Bonus rules: every `every_n` closes (of a plan) a team member makes
  // while the rule is on pays an extra `amount`.
  `CREATE TABLE IF NOT EXISTS crm_bonus_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    plan text NOT NULL DEFAULT 'yearly',
    every_n integer NOT NULL,
    amount integer NOT NULL,
    starts_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Manual commission lines (adjustments, + or -) and payouts the owner has
  // sent, per team member.
  `CREATE TABLE IF NOT EXISTS crm_pay_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    kind text NOT NULL,
    amount integer NOT NULL,
    note text NOT NULL DEFAULT '',
    at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Calls to the Twilio number (leads calling back). One row per call, so
  // Twilio retries never notify twice. lead_id is null for unknown numbers.
  `CREATE TABLE IF NOT EXISTS crm_inbound_calls (
    call_sid text PRIMARY KEY,
    lead_id uuid REFERENCES crm_leads (id) ON DELETE SET NULL,
    from_number text NOT NULL,
    status text NOT NULL DEFAULT 'ringing',
    answered_by_name text,
    recording_sid text,
    recording_seconds integer,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // The lead's latest missed call back, until someone calls them or answers.
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS missed_call_at timestamptz`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS missed_call_sid text`,
  `ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS missed_voicemail_sid text`,
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
