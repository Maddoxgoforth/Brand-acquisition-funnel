import "server-only";

import { query } from "./db";
import {
  ANSWERED_STATUS_IDS,
  APPOINTMENT_STATUS,
  SOURCE_IDS,
  STAT_RANGES,
  classifyField,
  cleanPhone,
  isStatusId,
  toE164,
  type Access,
  type Actor,
  type Lead,
  type LeadEvent,
  type SourceId,
  type StatRange,
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
  appointment_at: string | Date | null;
  appointment_tz: string | null;
  recording_url: string | null;
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
    appointmentAt: iso(row.appointment_at ?? null),
    appointmentTz: row.appointment_tz ?? null,
    recordingUrl: row.recording_url ?? null,
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
    actor_name: string | null;
    created_at: string | Date;
  }>(
    `SELECT id, type, data, actor_name, created_at FROM crm_events
     WHERE lead_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
    [leadId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    type: row.type,
    data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    actorName: row.actor_name,
    createdAt: iso(row.created_at)!,
  }));
}

async function addEvent(
  leadId: string,
  type: LeadEvent["type"],
  data: Record<string, string> = {},
  actor: Actor | null = null
) {
  await query(
    `INSERT INTO crm_events (lead_id, type, data, actor_id, actor_name)
     VALUES ($1, $2, $3::jsonb, $4, $5)`,
    [leadId, type, JSON.stringify(data), actor?.id ?? null, actor?.name ?? null]
  );
}

// Inserts leads into one list, skipping any whose phone or email is already
// in that list (or repeated inside the same batch). Returns how many were
// added vs skipped.
export async function addLeads(
  source: SourceId,
  inputs: LeadInput[],
  via: string,
  actor: Actor | null = null
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
      `INSERT INTO crm_events (lead_id, type, data, actor_id, actor_name)
       SELECT id::uuid, 'created', $2::jsonb, $3, $4
       FROM jsonb_array_elements_text($1::jsonb) AS id`,
      [
        JSON.stringify(inserted.map((l) => l.id)),
        JSON.stringify({ via }),
        actor?.id ?? via,
        actor?.name ?? null,
      ]
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
  // "" clears it.
  recordingUrl?: string;
  // Sets (or with null, clears) the time of a lead in "Appointment
  // scheduled". A lead can sit in that column with no time set.
  appointment?: { at: string; timeZone: string } | null;
};

export async function updateLead(
  id: string,
  patch: LeadPatch,
  actor: Actor | null = null
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

  // The appointment time only exists while the lead sits in that column
  // (and is optional there); moving the lead out clears it.
  let appointmentAt = current.appointmentAt;
  let appointmentTz = current.appointmentTz;
  if (next.status === APPOINTMENT_STATUS) {
    if (patch.appointment !== undefined) {
      appointmentAt = patch.appointment?.at ?? null;
      appointmentTz = patch.appointment?.timeZone ?? null;
    }
  } else {
    appointmentAt = null;
    appointmentTz = null;
  }

  const rows = await query<LeadRow>(
    `UPDATE crm_leads
     SET name = $2, phone = $3, phone_e164 = $4, email = $5, notes = $6,
         status = $7, extra = $8::jsonb, appointment_at = $9,
         appointment_tz = $10, recording_url = $11, updated_at = now()
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
      appointmentAt,
      appointmentTz,
      patch.recordingUrl !== undefined
        ? patch.recordingUrl.trim() || null
        : current.recordingUrl,
    ]
  );

  if (next.status !== current.status) {
    await addEvent(id, "status", { from: current.status, to: next.status }, actor);
  }
  if (next.status === APPOINTMENT_STATUS && appointmentAt !== current.appointmentAt) {
    await addEvent(id, "appointment", {
      at: appointmentAt ?? "",
      timeZone: appointmentTz ?? "",
    }, actor);
  }
  return rows[0] ? toLead(rows[0]) : null;
}

export async function deleteLead(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM crm_leads WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return rows.length > 0;
}

export async function recordCall(id: string, callSid: string, actor: Actor | null) {
  await query(
    `UPDATE crm_leads
     SET call_count = call_count + 1, last_called_at = now(), updated_at = now()
     WHERE id = $1`,
    [id]
  );
  await addEvent(id, "call", { callSid }, actor);
}

export async function setCallNotes(leadId: string, eventId: number, notes: string) {
  const rows = await query(
    `UPDATE crm_events SET data = data || jsonb_build_object('notes', $3::text)
     WHERE id = $2 AND lead_id = $1 AND type = 'call' RETURNING id`,
    [leadId, eventId, notes.slice(0, 5000)]
  );
  return rows.length > 0;
}

function funnel(dialed: number, answered: number, closed: number, base: number) {
  return {
    dialed,
    answered,
    closed,
    answerRate: dialed > 0 ? answered / dialed : null,
    conversionRate: base > 0 ? closed / base : null,
  };
}

// Dashboard numbers for one time frame, only for the lists this person can
// see.
//
// Opt-ins are a cohort: the free-course leads that came in during the range,
// and what has happened to them since. Conversion = closed / opt-ins.
//
// Dial lists are activity: leads dialed (called or moved columns) during the
// range. Answered = of those, now in an answered column. Closed = moved to
// Closed during the range. Conversion = closed / dialed.
export async function getStats(access: Access, range: StatRange): Promise<Stats> {
  const days = STAT_RANGES.find((r) => r.id === range)!.days;
  const [{ since }] = await query<{ since: string | Date | null }>(
    days === null
      ? `SELECT NULL::timestamptz AS since`
      : `SELECT now() - make_interval(days => $1) AS since`,
    days === null ? [] : [days]
  );
  const sinceIso = since === null ? null : new Date(since).toISOString();
  const answeredIds = ANSWERED_STATUS_IDS as unknown as string[];

  let optIns: Stats["optIns"] = null;
  if (access.applications) {
    const [row] = await query<{ total: number; dialed: number; answered: number; closed: number }>(
      `SELECT count(*)::int AS total,
         count(*) FILTER (WHERE status <> 'new' OR call_count > 0)::int AS dialed,
         count(*) FILTER (WHERE status = ANY($2::text[]))::int AS answered,
         count(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM crm_leads
       WHERE source = 'free_course_application'
         AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)`,
      [sinceIso, answeredIds]
    );
    optIns = { total: row.total, ...funnel(row.dialed, row.answered, row.closed, row.total) };
  }

  let dial: Stats["dial"] = null;
  if (access.dial) {
    const rows = await query<{
      source: SourceId;
      total: number;
      to_dial: number;
      dialed: number;
      answered: number;
      closed: number;
    }>(
      `WITH active AS (
         SELECT DISTINCT lead_id FROM crm_events
         WHERE type IN ('call', 'status', 'appointment')
           AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
       ), closes AS (
         SELECT DISTINCT lead_id FROM crm_events
         WHERE type = 'status' AND data->>'to' = 'closed'
           AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
       ), worked AS (
         SELECT l.*,
           (a.lead_id IS NOT NULL OR ($1::timestamptz IS NULL
             AND (l.status <> 'new' OR l.call_count > 0))) AS was_dialed,
           (c.lead_id IS NOT NULL OR ($1::timestamptz IS NULL
             AND l.status = 'closed')) AS was_closed
         FROM crm_leads l
         LEFT JOIN active a ON a.lead_id = l.id
         LEFT JOIN closes c ON c.lead_id = l.id
         WHERE l.source IN ('dial_free_course', 'dial_high_ticket')
       )
       SELECT source,
         count(*)::int AS total,
         count(*) FILTER (WHERE status = 'new' AND call_count = 0)::int AS to_dial,
         count(*) FILTER (WHERE was_dialed)::int AS dialed,
         count(*) FILTER (WHERE was_dialed AND status = ANY($2::text[]))::int AS answered,
         count(*) FILTER (WHERE was_closed AND status = 'closed')::int AS closed
       FROM worked GROUP BY source`,
      [sinceIso, answeredIds]
    );
    const bySource = SOURCE_IDS.filter((s) => s !== "free_course_application").map(
      (source) => {
        const r = rows.find((x) => x.source === source);
        const [d, a, c] = [r?.dialed ?? 0, r?.answered ?? 0, r?.closed ?? 0];
        return { source, total: r?.total ?? 0, toDial: r?.to_dial ?? 0, ...funnel(d, a, c, d) };
      }
    );
    const sum = (k: "total" | "toDial" | "dialed" | "answered" | "closed") =>
      bySource.reduce((n, r) => n + r[k], 0);
    dial = {
      leadsInLists: sum("total"),
      toDial: sum("toDial"),
      ...funnel(sum("dialed"), sum("answered"), sum("closed"), sum("dialed")),
      bySource,
    };
  }

  const visible = SOURCE_IDS.filter((s) =>
    s === "free_course_application" ? access.applications : access.dial
  ) as string[];
  const board = await query<{
    actor_id: string;
    name: string;
    dials: number;
    leads_called: number;
    answered: number;
    closes: number;
  }>(
    `WITH ev AS (
       SELECT e.*, l.status AS lead_status FROM crm_events e
       JOIN crm_leads l ON l.id = e.lead_id
       WHERE e.actor_id IS NOT NULL AND e.actor_id NOT IN ('website', 'webhook', 'manual')
         AND l.source = ANY($2::text[])
         AND ($1::timestamptz IS NULL OR e.created_at >= $1::timestamptz)
     )
     SELECT actor_id, max(actor_name) AS name,
       count(*) FILTER (WHERE type = 'call')::int AS dials,
       count(DISTINCT lead_id) FILTER (WHERE type = 'call')::int AS leads_called,
       count(DISTINCT lead_id) FILTER (WHERE type = 'call' AND lead_status = ANY($3::text[]))::int AS answered,
       count(DISTINCT lead_id) FILTER (WHERE type = 'status' AND data->>'to' = 'closed')::int AS closes
     FROM ev GROUP BY actor_id
     ORDER BY closes DESC, dials DESC`,
    [sinceIso, visible, answeredIds]
  );
  const leaderboard = board.map((r) => ({
    actorId: r.actor_id,
    name: r.name || "Unknown",
    dials: r.dials,
    leadsCalled: r.leads_called,
    answered: r.answered,
    closes: r.closes,
    answerRate: r.leads_called > 0 ? r.answered / r.leads_called : null,
  }));

  return { range, leaderboard, optIns, dial };
}
