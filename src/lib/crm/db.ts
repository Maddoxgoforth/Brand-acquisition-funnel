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
