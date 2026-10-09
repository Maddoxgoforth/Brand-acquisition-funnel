import "server-only";

import { query } from "./db";
import {
  ANSWERED_STATUS_IDS,
  SOURCE_IDS,
  classifyField,
  cleanPhone,
  isStatusId,
  toE164,
  type Lead,
  type LeadEvent,
  type SourceId,
  type Stats,
  type StatusId,
} from "./constants";

type LeadRow = {
  id: string;
  source: SourceId;
  name: string;
  phone: string;
  phone_e164: string | null;
  email: string;
  extra: Record<string, unknown> | string | null;
  status: StatusId;
  notes: string;
  call_count: number;
  last_called_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function iso(value: string | Date | null) {
  return value === null ? null : new Date(value).toISOString();
}

function toLead(row: LeadRow): Lead {
  const rawExtra =
    typeof row.extra === "string" ? JSON.parse(row.extra) : row.extra ?? {};
  return {
    id: row.id,
    source: row.source,
    name: row.name,
    phone: row.phone,
    phoneE164: row.phone_e164,
    email: row.email,
    extra: cleanExtra(rawExtra),
    status: row.status,
    notes: row.notes,
    callCount: Number(row.call_count),
    lastCalledAt: iso(row.last_called_at),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

// Extra fields are stored as flat label → text so the UI can always show and
// edit them, whatever shape they arrived in.
function cleanExtra(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const label = key.trim().slice(0, 80);
    const text = stringify(value).slice(0, 5000);
    if (label && text) out[label] = text;
  }
  return out;
}

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  extra: Record<string, string>;
};

// Accepts any object (a form post, a CSV row, a webhook payload). Pulls out
// name / phone / email by common header names and keeps every other field
// under `extra`, so nothing that gets sent in is dropped.
export function normalizeLeadInput(raw: unknown): LeadInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const rest: Record<string, unknown> = {};
  let name = "";
  let first = "";
  let last = "";
  let phone = "";
  let email = "";

  for (const [key, value] of Object.entries(raw)) {
    if (key.trim().toLowerCase() === "extra" && value && typeof value === "object") {
      Object.assign(rest, value);
      continue;
    }
    // The first non-empty match wins; later matches stay as extra info.
    const text = stringify(value);
    const field = text ? classifyField(key) : null;
    if (field === "name" && !name) name = text;
    else if (field === "first" && !first) first = text;
    else if (field === "last" && !last) last = text;
    else if (field === "phone" && !phone) phone = cleanPhone(text);
    else if (field === "email" && !email) email = text;
    else rest[key] = value;
  }

  if (!name) name = [first, last].filter(Boolean).join(" ");
  if (!name && !phone && !email) return null;

  return {
    name: name.slice(0, 200),
    phone: phone.slice(0, 40),
    email: email.slice(0, 200).toLowerCase(),
    extra: cleanExtra(rest),
  };
}

export async function listLeads(source: SourceId): Promise<Lead[]> {
  // New applications show newest first (call them while they're warm). The
  // hand-filled dial lists show in the order the leads were added, so the
  // first ones you put in are the first ones to call.
  const order =
    source === "free_course_application" ? "created_at DESC, seq DESC" : "seq ASC";
  const rows = await query<LeadRow>(
    `SELECT * FROM crm_leads WHERE source = $1 ORDER BY ${order}`,
    [source]
  );
  return rows.map(toLead);
}

// Free-course opt-ins that arrived after `since` (a cursor from an earlier
// call). The cursor is the database's own clock, so the page and the server
// never disagree about what counts as new.
export async function listNewApplications(
  since: string | null
): Promise<{ cursor: string; leads: Lead[] }> {
  const [{ now }] = await query<{ now: string | Date }>(`SELECT now() AS now`);
  const cursor = iso(now)!;
  if (!since) return { cursor, leads: [] };

  const rows = await query<LeadRow>(
    `SELECT * FROM crm_leads
     WHERE source = 'free_course_application'
       AND created_at > $1::timestamptz AND created_at <= $2::timestamptz
     ORDER BY created_at DESC, seq DESC LIMIT 50`,
    [since, cursor]
  );
  return { cursor, leads: rows.map(toLead) };
}

export async function getLead(id: string): Promise<Lead | null> {
  const rows = await query<LeadRow>(`SELECT * FROM crm_leads WHERE id = $1`, [
    id,
  ]);
  return rows[0] ? toLead(rows[0]) : null;
}

export async function listEvents(leadId: string): Promise<LeadEvent[]> {
  const rows = await query<{
    id: number | string;
    type: LeadEvent["type"];
    data: Record<string, string> | string;
    created_at: string | Date;
  }>(
    `SELECT id, type, data, created_at FROM crm_events
     WHERE lead_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
    [leadId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    type: row.type,
    data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    createdAt: iso(row.created_at)!,
  }));
}

async function addEvent(
  leadId: string,
  type: LeadEvent["type"],
  data: Record<string, string> = {}
) {
  await query(
    `INSERT INTO crm_events (lead_id, type, data) VALUES ($1, $2, $3::jsonb)`,
    [leadId, type, JSON.stringify(data)]
  );
}

// Inserts leads into one list, skipping any whose phone or email is already
// in that list (or repeated inside the same batch). Returns how many were
// added vs skipped.
export async function addLeads(
  source: SourceId,
  inputs: LeadInput[],
  via: string
): Promise<{ added: number; skipped: number; leads: Lead[] }> {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const batch: (LeadInput & { phone_e164: string | null })[] = [];

  for (const raw of inputs) {
    const input = {
      ...raw,
      phone: cleanPhone(raw.phone),
      email: raw.email.trim().toLowerCase(),
    };
    const phone_e164 = toE164(input.phone);
    if (phone_e164 && seenPhones.has(phone_e164)) continue;
    if (!phone_e164 && input.email && seenEmails.has(input.email)) continue;
    if (phone_e164) seenPhones.add(phone_e164);
    if (input.email) seenEmails.add(input.email);
    batch.push({ ...input, phone_e164 });
  }

  const inserted: Lead[] = [];
  const CHUNK = 400;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const rows = await query<LeadRow>(
      `INSERT INTO crm_leads (source, name, phone, phone_e164, email, extra)
       SELECT $1, x.name, x.phone, x.phone_e164, x.email, x.extra
       FROM (
         SELECT el->>'name' AS name, el->>'phone' AS phone,
                el->>'phone_e164' AS phone_e164, el->>'email' AS email,
                el->'extra' AS extra, ord
         FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS a(el, ord)
       ) AS x
       WHERE NOT EXISTS (
         SELECT 1 FROM crm_leads l
         WHERE l.source = $1 AND (
           (x.phone_e164 IS NOT NULL AND l.phone_e164 = x.phone_e164)
           OR (x.phone_e164 IS NULL AND x.email <> '' AND l.email = x.email)
         )
       )
       ORDER BY x.ord
       RETURNING *`,
      [source, JSON.stringify(batch.slice(i, i + CHUNK))]
    );
    inserted.push(...rows.map(toLead));
  }

  if (inserted.length > 0) {
    await query(
      `INSERT INTO crm_events (lead_id, type, data)
       SELECT id::uuid, 'created', $2::jsonb
       FROM jsonb_array_elements_text($1::jsonb) AS id`,
      [JSON.stringify(inserted.map((l) => l.id)), JSON.stringify({ via })]
    );
  }

  return {
    added: inserted.length,
    skipped: inputs.length - inserted.length,
    leads: inserted,
  };
}

// One-off clean-up for leads imported before a column was recognized: their
// phone / email / name ended up under `extra`. Moves those values into the
// real fields. Safe to run repeatedly; returns how many leads it fixed.
export async function repairContactFields(): Promise<number> {
  const rows = await query<LeadRow>(
    `SELECT * FROM crm_leads
     WHERE (phone = '' OR email = '' OR name = '') AND extra <> '{}'::jsonb`
  );

  const fixes: Record<string, unknown>[] = [];
  for (const lead of rows.map(toLead)) {
    const found = normalizeLeadInput(lead.extra);
    if (!found) continue;
    const name = lead.name || found.name;
    const phone = lead.phone || found.phone;
    const email = lead.email || found.email;
    if (name === lead.name && phone === lead.phone && email === lead.email) {
      continue;
    }
    // Keep any extra field that wasn't the one promoted.
    const extra = { ...lead.extra };
    for (const key of Object.keys(extra)) {
      const field = classifyField(key);
      const used =
        (field === "phone" && !lead.phone && cleanPhone(extra[key]) === phone) ||
        (field === "email" && !lead.email && extra[key].toLowerCase() === email) ||
        ((field === "name" || field === "first" || field === "last") &&
          !lead.name);
      if (used) delete extra[key];
    }
    fixes.push({ id: lead.id, name, phone, phone_e164: toE164(phone), email, extra });
  }

  const CHUNK = 400;
  for (let i = 0; i < fixes.length; i += CHUNK) {
    await query(
      `UPDATE crm_leads l
       SET name = x.name, phone = x.phone, phone_e164 = x.phone_e164,
           email = x.email, extra = x.extra
       FROM jsonb_to_recordset($1::jsonb)
         AS x(id uuid, name text, phone text, phone_e164 text, email text, extra jsonb)
       WHERE l.id = x.id`,
      [JSON.stringify(fixes.slice(i, i + CHUNK))]
    );
  }
  return fixes.length;
}

export type LeadPatch = {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status?: StatusId;
  extra?: Record<string, string>;
};

export async function updateLead(
  id: string,
  patch: LeadPatch
): Promise<Lead | null> {
  const current = await getLead(id);
  if (!current) return null;

  const next = {
    name: patch.name?.slice(0, 200) ?? current.name,
    phone: patch.phone !== undefined ? cleanPhone(patch.phone).slice(0, 40) : current.phone,
    email: patch.email?.slice(0, 200).toLowerCase() ?? current.email,
    notes: patch.notes?.slice(0, 20000) ?? current.notes,
    status:
      patch.status && isStatusId(patch.status) ? patch.status : current.status,
    extra: patch.extra ? cleanExtra(patch.extra) : current.extra,
  };

  const rows = await query<LeadRow>(
    `UPDATE crm_leads
     SET name = $2, phone = $3, phone_e164 = $4, email = $5, notes = $6,
         status = $7, extra = $8::jsonb, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      next.name,
      next.phone,
      toE164(next.phone),
      next.email,
      next.notes,
      next.status,
      JSON.stringify(next.extra),
    ]
  );

  if (next.status !== current.status) {
    await addEvent(id, "status", { from: current.status, to: next.status });
  }
  return rows[0] ? toLead(rows[0]) : null;
}

export async function deleteLead(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM crm_leads WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return rows.length > 0;
}

export async function recordCall(id: string, callSid: string) {
  await query(
    `UPDATE crm_leads
     SET call_count = call_count + 1, last_called_at = now(), updated_at = now()
     WHERE id = $1`,
    [id]
  );
  await addEvent(id, "call", { callSid });
}

export async function getStats(): Promise<Stats> {
  const [optIns] = await query<{ day: number; week: number; month: number }>(
    `SELECT
       count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS day,
       count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week,
       count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS month
     FROM crm_leads WHERE source = 'free_course_application'`
  );

  // "Dialed" = moved out of To dial, or called at least once from the CRM.
  const rows = await query<{
    source: SourceId;
    total: number;
    dialed: number;
    answered: number;
    closed: number;
  }>(
    `SELECT source,
       count(*)::int AS total,
       count(*) FILTER (WHERE status <> 'new' OR call_count > 0)::int AS dialed,
       count(*) FILTER (WHERE status = ANY($1::text[]))::int AS answered,
       count(*) FILTER (WHERE status = 'closed')::int AS closed
     FROM crm_leads GROUP BY source`,
    [ANSWERED_STATUS_IDS as unknown as string[]]
  );

  const bySource = SOURCE_IDS.map((source) => {
    const row = rows.find((r) => r.source === source);
    return {
      source,
      total: row?.total ?? 0,
      dialed: row?.dialed ?? 0,
      answered: row?.answered ?? 0,
      closed: row?.closed ?? 0,
    };
  });

  const sum = (key: "total" | "dialed" | "answered" | "closed") =>
    bySource.reduce((n, row) => n + row[key], 0);
  const dialed = sum("dialed");
  const answered = sum("answered");
  const closed = sum("closed");

  return {
    freeCourseOptIns: {
      day: optIns?.day ?? 0,
      week: optIns?.week ?? 0,
      month: optIns?.month ?? 0,
    },
    totalLeads: sum("total"),
    dialed,
    answered,
    closed,
    conversionRate: dialed > 0 ? closed / dialed : null,
    answerRate: dialed > 0 ? answered / dialed : null,
    bySource,
  };
}
