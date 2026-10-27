import "server-only";

import { sendMetaEvent } from "@/lib/meta";
import { sendTikTokEvent } from "@/lib/tiktok";

import { query } from "./db";
import {
  ANSWERED_STATUS_IDS,
  APPOINTMENT_STATUS,
  FUNNEL_STEPS,
  OPT_IN_SOURCES,
  SOURCES,
  SOURCE_IDS,
  STAT_RANGES,
  classifyField,
  cleanPhone,
  isOptInSource,
  isStatusId,
  toE164,
  type Access,
  type Actor,
  type Lead,
  type LeadEvent,
  type OptInChannel,
  type SourceId,
  type StatRange,
  type Stats,
  type StatusId,
  type LeaderboardRow,
  type TeamSummary,
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
  first_contact_at: string | Date | null;
  opt_in_count: number;
  last_opt_in_at: string | Date | null;
  attribution: Record<string, unknown> | string | null;
  call_count: number;
  last_called_at: string | Date | null;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function iso(value: string | Date | null) {
  return value === null ? null : new Date(value).toISOString();
}

// Attribution keys the CRM screens may show. Browser ids (fbc/fbp), IP and
// user agent stay on the server for the Conversions API.
const PUBLIC_ATTRIBUTION = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "landing_page",
];

function parseJson(value: Record<string, unknown> | string | null | undefined) {
  return (typeof value === "string" ? JSON.parse(value) : value ?? {}) as Record<string, unknown>;
}

export function rawAttribution(row: { attribution?: Record<string, unknown> | string | null }) {
  return cleanExtra(parseJson(row.attribution));
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
    firstContactAt: iso(row.first_contact_at ?? null),
    optInCount: Number(row.opt_in_count ?? 1),
    lastOptInAt: iso(row.last_opt_in_at ?? null) ?? iso(row.created_at)!,
    attribution: Object.fromEntries(
      Object.entries(rawAttribution(row)).filter(([k]) => PUBLIC_ATTRIBUTION.includes(k))
    ),
    callCount: Number(row.call_count),
    lastCalledAt: iso(row.last_called_at),
    claimedById: row.claimed_by_id ?? null,
    claimedByName: row.claimed_by_name ?? null,
    claimedAt: iso(row.claimed_at ?? null),
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
  attribution?: Record<string, string>;
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
    isOptInSource(source)
      ? "coalesce(last_opt_in_at, created_at) DESC, seq DESC"
      : "seq ASC";
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
     WHERE source = ANY($3::text[])
       AND coalesce(last_opt_in_at, created_at) > $1::timestamptz
       AND coalesce(last_opt_in_at, created_at) <= $2::timestamptz
     ORDER BY coalesce(last_opt_in_at, created_at) DESC, seq DESC LIMIT 50`,
    [since, cursor, OPT_IN_SOURCES]
  );
  return { cursor, leads: rows.map(toLead) };
}

// The full row (with browser ids / IP) for sending conversions to Meta.
export async function getLeadForTracking(id: string) {
  const rows = await query<LeadRow>(`SELECT * FROM crm_leads WHERE id = $1`, [id]);
  return rows[0] ? { lead: toLead(rows[0]), attribution: rawAttribution(rows[0]) } : null;
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
  const batch: (LeadInput & { phone_e164: string | null; attribution: Record<string, string> })[] = [];

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
    batch.push({ ...input, phone_e164, attribution: cleanExtra(input.attribution ?? {}) });
  }

  const inserted: Lead[] = [];
  const CHUNK = 400;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const rows = await query<LeadRow>(
      `INSERT INTO crm_leads (source, name, phone, phone_e164, email, extra, attribution)
       SELECT $1, x.name, x.phone, x.phone_e164, x.email, x.extra, x.attribution
       FROM (
         SELECT el->>'name' AS name, el->>'phone' AS phone,
                el->>'phone_e164' AS phone_e164, el->>'email' AS email,
                el->'extra' AS extra, coalesce(el->'attribution', '{}'::jsonb) AS attribution, ord
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

  // Someone already in Free course applications opted in again: put them
  // back in To dial (a fresh lead to call) and note it. Leads in Closed or
  // Do not call stay where they are but still get the note and count.
  const reOptedIn: Lead[] = [];
  if (isOptInSource(source)) {
    const insertedKeys = new Set(
      inserted.flatMap((l) => [l.phoneE164, l.email].filter(Boolean))
    );
    for (const input of batch) {
      if (
        (input.phone_e164 && insertedKeys.has(input.phone_e164)) ||
        (!input.phone_e164 && input.email && insertedKeys.has(input.email))
      ) {
        continue;
      }
      const lead = await reOptIn(source, input, via, actor);
      if (lead) reOptedIn.push(lead);
    }
  }

  return {
    added: inserted.length,
    skipped: inputs.length - inserted.length - reOptedIn.length,
    leads: [...inserted, ...reOptedIn],
  };
}

async function reOptIn(
  source: SourceId,
  input: LeadInput & { phone_e164: string | null; attribution: Record<string, string> },
  via: string,
  actor: Actor | null
): Promise<Lead | null> {
  const [existing] = await query<LeadRow>(
    `SELECT * FROM crm_leads
     WHERE source = $3 AND (
       ($1::text IS NOT NULL AND phone_e164 = $1)
       OR ($1::text IS NULL AND $2 <> '' AND email = $2)
     )
     ORDER BY created_at LIMIT 1`,
    [input.phone_e164, input.email, source]
  );
  if (!existing) return null;
  const keep = existing.status === "closed" || existing.status === "do_not_call";
  const [row] = await query<LeadRow>(
    `UPDATE crm_leads SET
       opt_in_count = opt_in_count + 1,
       last_opt_in_at = now(),
       status = CASE WHEN $2 THEN status ELSE 'new' END,
       appointment_at = CASE WHEN $2 THEN appointment_at ELSE NULL END,
       appointment_tz = CASE WHEN $2 THEN appointment_tz ELSE NULL END,
       first_contact_at = CASE WHEN $2 THEN first_contact_at ELSE NULL END,
       email = CASE WHEN email = '' THEN $3 ELSE email END,
       attribution = CASE WHEN $4::jsonb = '{}'::jsonb THEN attribution ELSE $4::jsonb END,
       extra = extra || $5::jsonb,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [existing.id, keep, input.email, JSON.stringify(input.attribution), JSON.stringify(input.extra)]
  );
  await addEvent(
    existing.id,
    "reoptin",
    {
      via,
      from: existing.status,
      name: input.name,
      email: input.email,
      phone: input.phone,
      count: String(row.opt_in_count),
    },
    actor
  );
  return toLead(row);
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

  if (next.status !== current.status && !current.firstContactAt) {
    await markFirstContact(id);
  }
  if (next.status !== current.status) {
    await addEvent(id, "status", { from: current.status, to: next.status }, actor);
  }
  if (next.status !== current.status) {
    await reportStageToAdPlatforms(id, next.status);
  }
  if (next.status === APPOINTMENT_STATUS && appointmentAt !== current.appointmentAt) {
    await addEvent(id, "appointment", {
      at: appointmentAt ?? "",
      timeZone: appointmentTz ?? "",
    }, actor);
  }
  return rows[0] ? toLead(rows[0]) : null;
}

// Tells Meta and TikTok when an opt-in books a call or buys, so ads can
// optimize for buyers instead of just opt-ins. (TikTok uses the same names:
// Schedule and Purchase are TikTok standard events too.) The event id is fixed per lead and stage,
// so moving a card back and forth never counts twice.
const META_STAGES: Partial<Record<StatusId, string>> = {
  appointment: "Schedule",
  closed: "Purchase",
};

async function reportStageToAdPlatforms(id: string, status: StatusId) {
  const name = META_STAGES[status];
  if (!name) return;
  try {
    const found = await getLeadForTracking(id);
    if (!found || !isOptInSource(found.lead.source)) return;
    const { lead, attribution } = found;
    const value = Number(process.env.META_PURCHASE_VALUE || 1000);
    await sendMetaEvent({
      name,
      eventId: `${lead.id}-${status}`,
      url: attribution.landing_url || undefined,
      user: {
        email: lead.email,
        phone: lead.phoneE164 ?? lead.phone,
        firstName: lead.name,
        ip: attribution.ip,
        userAgent: attribution.user_agent,
        fbc: attribution.fbc,
        fbp: attribution.fbp,
        externalId: lead.id,
      },
      customData:
        name === "Purchase" ? { currency: "USD", value } : { lead_source: lead.source },
    });
    await sendTikTokEvent({
      name,
      eventId: `${lead.id}-${status}`,
      url: attribution.landing_url || undefined,
      user: {
        email: lead.email,
        phone: lead.phoneE164 ?? lead.phone,
        ip: attribution.ip,
        userAgent: attribution.user_agent,
        ttp: attribution.ttp,
        ttclid: attribution.ttclid,
        externalId: lead.id,
      },
      properties:
        name === "Purchase"
          ? { currency: "USD", value, content_name: "mentorship" }
          : { content_name: "call_booked" },
    });
  } catch (error) {
    console.error("Reporting stage to Meta failed:", error);
  }
}

export async function deleteLead(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM crm_leads WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return rows.length > 0;
}

async function markFirstContact(id: string) {
  await query(
    `UPDATE crm_leads SET first_contact_at = now()
     WHERE id = $1 AND first_contact_at IS NULL`,
    [id]
  );
}

export async function recordCall(id: string, callSid: string, actor: Actor | null) {
  await markFirstContact(id);
  await query(
    `UPDATE crm_leads
     SET call_count = call_count + 1, last_called_at = now(), updated_at = now()
     WHERE id = $1`,
    [id]
  );
  await addEvent(id, "call", { callSid }, actor);
  // The first person to call a lead claims it.
  if (actor) {
    const claimed = await query(
      `UPDATE crm_leads
       SET claimed_by_id = $2, claimed_by_name = $3, claimed_at = now()
       WHERE id = $1 AND claimed_by_id IS NULL RETURNING id`,
      [id, actor.id, actor.name]
    );
    if (claimed.length) await addEvent(id, "claim", { action: "claimed", by: actor.name }, actor);
  }
}

export class ClaimConflictError extends Error {}

// Claim (or release) a lead. Anyone can claim a lead nobody has; a lead
// someone else claimed can only be taken over or released by the owner.
export async function setClaim(
  id: string,
  claim: boolean,
  actor: Actor,
  isOwner: boolean
): Promise<Lead | null> {
  const current = await getLead(id);
  if (!current) return null;
  const mine = current.claimedById === actor.id;
  if (claim && mine) return current;
  if (!claim && !current.claimedById) return current;
  if (current.claimedById && !mine && !isOwner) {
    throw new ClaimConflictError(
      `${current.claimedByName || "Someone else"} already claimed this lead.`
    );
  }
  const rows = await query<LeadRow>(
    `UPDATE crm_leads
     SET claimed_by_id = $2, claimed_by_name = $3, claimed_at = $4, updated_at = now()
     WHERE id = $1 RETURNING *`,
    claim
      ? [id, actor.id, actor.name, new Date().toISOString()]
      : [id, null, null, null]
  );
  const action = claim ? (current.claimedById ? "took over" : "claimed") : "released";
  await addEvent(
    id,
    "claim",
    { action, by: actor.name, ...(current.claimedByName ? { from: current.claimedByName } : {}) },
    actor
  );
  return rows[0] ? toLead(rows[0]) : null;
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
// Page tracking: one row per visitor per step, at most once per hour so
// refreshes don't pile up rows.
export async function recordSiteEvent(
  visitorId: string,
  funnelId: string,
  step: string,
  campaign: string
) {
  await query(
    `INSERT INTO site_events (visitor_id, funnel, step, campaign)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM site_events
       WHERE visitor_id = $1 AND funnel = $2 AND step = $3
         AND created_at > now() - interval '1 hour'
     )`,
    [visitorId.slice(0, 64), funnelId, step, campaign.slice(0, 200)]
  );
}

export async function getStats(
  access: Access,
  range: StatRange,
  owner: boolean
): Promise<Stats> {
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
  let adFunnel: Stats["adFunnel"] = null;
  let campaigns: Stats["campaigns"] = null;
  if (access.applications) {
    const rows = await query<{
      source: SourceId;
      total: number;
      dialed: number;
      answered: number;
      booked: number;
      closed: number;
      contacted: number;
      within5: number;
      avg_s: number | null;
      median_s: number | null;
    }>(
      `SELECT source, count(*)::int AS total,
         count(*) FILTER (WHERE status <> 'new' OR call_count > 0)::int AS dialed,
         count(*) FILTER (WHERE status = ANY($2::text[]))::int AS answered,
         count(*) FILTER (WHERE status IN ('appointment', 'closed')
           OR EXISTS (SELECT 1 FROM crm_events e WHERE e.lead_id = l.id AND e.type = 'appointment'))::int AS booked,
         count(*) FILTER (WHERE status = 'closed')::int AS closed,
         count(first_contact_at)::int AS contacted,
         count(*) FILTER (WHERE first_contact_at - opt_at <= interval '5 minutes')::int AS within5,
         -- Leads called before their latest opt-in (kept in Closed / Do not
         -- call) have no speed to lead for it.
         avg(extract(epoch FROM first_contact_at - opt_at)) FILTER (WHERE first_contact_at >= opt_at)::float AS avg_s,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM first_contact_at - opt_at))
           FILTER (WHERE first_contact_at >= opt_at)::float AS median_s
       FROM (SELECT *, coalesce(last_opt_in_at, created_at) AS opt_at FROM crm_leads) l
       WHERE source = ANY($3::text[])
         AND ($1::timestamptz IS NULL OR opt_at >= $1::timestamptz)
       GROUP BY source`,
      [sinceIso, answeredIds, OPT_IN_SOURCES]
    );

    // Unique visitors per funnel step from the page tracking.
    const steps = await query<{ funnel: string; step: string; visitors: number }>(
      `SELECT funnel, step, count(DISTINCT visitor_id)::int AS visitors
       FROM site_events
       WHERE ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
       GROUP BY funnel, step`,
      [sinceIso]
    );
    const visitorsAt = (funnel: string, step: string) =>
      steps.find((r) => r.funnel === funnel && r.step === step)?.visitors ?? 0;
    const tracked = steps.length > 0;

    // Opt-in rate uses tracked opt-ins over tracked visitors, so leads from
    // before page tracking existed don't inflate it.
    const rate = (f: "ads" | "organic") => {
      const views = visitorsAt(f, "view");
      return tracked && views > 0 ? visitorsAt(f, "optin") / views : null;
    };
    const channel = (source: SourceId, visitors: number | null, optInRate: number | null): OptInChannel => {
      const r = rows.find((x) => x.source === source);
      const total = r?.total ?? 0;
      const booked = r?.booked ?? 0;
      return {
        source,
        label: SOURCES.find((x) => x.id === source)!.label,
        total,
        visitors,
        optInRate,
        booked,
        bookRate: total > 0 ? booked / total : null,
        ...funnel(r?.dialed ?? 0, r?.answered ?? 0, r?.closed ?? 0, total),
        contacted: r?.contacted ?? 0,
        within5: r?.within5 ?? 0,
        waiting: total - (r?.contacted ?? 0),
        avgFirstContactSeconds: r?.avg_s ?? null,
        medianFirstContactSeconds: r?.median_s ?? null,
      };
    };
    const channels = [
      channel("ad_free_course_application", tracked ? visitorsAt("ads", "view") : null, rate("ads")),
      channel("free_course_application", tracked ? visitorsAt("organic", "view") : null, rate("organic")),
    ];
    // Both channels combined; averages weighted by how many were called.
    const sum = (k: keyof OptInChannel) =>
      channels.reduce((n, c) => n + ((c[k] as number | null) ?? 0), 0);
    const contacted = sum("contacted");
    const weighted = (k: "avgFirstContactSeconds" | "medianFirstContactSeconds") =>
      contacted > 0
        ? channels.reduce((n, c) => n + (c[k] ?? 0) * c.contacted, 0) / contacted
        : null;
    const total = sum("total");
    const visitors = tracked ? sum("visitors") : null;
    optIns = {
      channels,
      total: {
        source: "free_course_application",
        label: "All opt-ins",
        total,
        visitors,
        optInRate: visitors
          ? (visitorsAt("ads", "optin") + visitorsAt("organic", "optin")) / visitors
          : null,
        booked: sum("booked"),
        bookRate: total > 0 ? sum("booked") / total : null,
        ...funnel(sum("dialed"), sum("answered"), sum("closed"), total),
        contacted,
        within5: sum("within5"),
        waiting: total - contacted,
        avgFirstContactSeconds: weighted("avgFirstContactSeconds"),
        medianFirstContactSeconds: weighted("medianFirstContactSeconds"),
      },
    };

    adFunnel = FUNNEL_STEPS.ads.map((s) => ({
      step: s.step,
      label: s.label,
      visitors: visitorsAt("ads", s.step),
    }));

    const byAd = await query<{
      source: string;
      campaign: string;
      ad: string;
      opt_ins: number;
      booked: number;
      closed: number;
    }>(
      `SELECT coalesce(nullif(attribution->>'utm_source', ''), '–') AS source,
         coalesce(nullif(attribution->>'utm_campaign', ''), '(no campaign tag)') AS campaign,
         coalesce(nullif(attribution->>'utm_content', ''), '–') AS ad,
         count(*)::int AS opt_ins,
         count(*) FILTER (WHERE status IN ('appointment', 'closed')
           OR EXISTS (SELECT 1 FROM crm_events e WHERE e.lead_id = l.id AND e.type = 'appointment'))::int AS booked,
         count(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM crm_leads l
       WHERE source = 'ad_free_course_application'
         AND ($1::timestamptz IS NULL OR coalesce(last_opt_in_at, created_at) >= $1::timestamptz)
       GROUP BY 1, 2, 3 ORDER BY opt_ins DESC LIMIT 50`,
      [sinceIso]
    );
    campaigns = byAd.map((r) => ({
      source: r.source,
      campaign: r.campaign,
      ad: r.ad,
      optIns: r.opt_ins,
      booked: r.booked,
      closed: r.closed,
    }));
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
    const bySource = SOURCE_IDS.filter((s) => !isOptInSource(s)).map(
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
    isOptInSource(s) ? access.applications : access.dial
  ) as string[];
  // Activity per person (and, in the row with no actor_id, the whole team).
  const board = await query<{
    actor_id: string | null;
    name: string | null;
    dials: number;
    leads_called: number;
    answered: number;
    booked: number;
    closes: number;
  }>(
    `WITH ev AS (
       SELECT e.*, l.status AS lead_status FROM crm_events e
       JOIN crm_leads l ON l.id = e.lead_id
       WHERE e.type IN ('call', 'status') AND e.actor_id IS NOT NULL AND e.actor_id NOT IN ('website', 'webhook', 'manual')
         AND l.source = ANY($2::text[])
         AND ($1::timestamptz IS NULL OR e.created_at >= $1::timestamptz)
     )
     SELECT actor_id, max(actor_name) AS name,
       count(*) FILTER (WHERE type = 'call')::int AS dials,
       count(DISTINCT lead_id) FILTER (WHERE type = 'call')::int AS leads_called,
       count(DISTINCT lead_id) FILTER (WHERE type = 'call' AND lead_status = ANY($3::text[]))::int AS answered,
       count(DISTINCT lead_id) FILTER (WHERE type = 'status' AND data->>'to' = 'appointment')::int AS booked,
       count(DISTINCT lead_id) FILTER (WHERE type = 'status' AND data->>'to' = 'closed')::int AS closes
     FROM ev GROUP BY ROLLUP (actor_id)`,
    [sinceIso, visible, answeredIds]
  );
  const claims = await query<{ id: string; name: string | null; claimed: number; closed: number }>(
    `SELECT claimed_by_id AS id, max(claimed_by_name) AS name, count(*)::int AS claimed,
       count(*) FILTER (WHERE status = 'closed')::int AS closed
     FROM crm_leads
     WHERE claimed_by_id IS NOT NULL AND source = ANY($2::text[])
       AND ($1::timestamptz IS NULL OR claimed_at >= $1::timestamptz)
     GROUP BY claimed_by_id`,
    [sinceIso, visible]
  );
  // Speed to lead per person: opt-ins in the range, credited to whoever made
  // the first call or move after the (latest) opt-in.
  const speed = access.applications
    ? await query<{ id: string; avg_s: number; n: number }>(
        `SELECT f.actor_id AS id, avg(extract(epoch FROM l.first_contact_at - l.opt_at))::float AS avg_s,
           count(*)::int AS n
         FROM (SELECT *, coalesce(last_opt_in_at, created_at) AS opt_at FROM crm_leads) l
         JOIN LATERAL (
           SELECT actor_id FROM crm_events e
           WHERE e.lead_id = l.id AND e.type IN ('call', 'status') AND e.actor_id IS NOT NULL
             AND e.actor_id NOT IN ('website', 'webhook', 'manual') AND e.created_at >= l.opt_at
           ORDER BY e.created_at LIMIT 1
         ) f ON true
         WHERE l.source = ANY($2::text[]) AND l.first_contact_at >= l.opt_at
           AND ($1::timestamptz IS NULL OR l.opt_at >= $1::timestamptz)
         GROUP BY f.actor_id`,
        [sinceIso, OPT_IN_SOURCES]
      )
    : [];
  // Active team members show up even before their first dial.
  const members = await query<{ id: string; name: string }>(
    `SELECT id::text AS id, name FROM crm_users WHERE status = 'active'`
  );

  const people = new Map<string, LeaderboardRow>();
  const person = (id: string, name: string | null) => {
    let row = people.get(id);
    if (!row) {
      row = {
        actorId: id,
        name: name || (id === "owner" ? "Owner" : "Unknown"),
        dials: 0, leadsCalled: 0, answered: 0, answerRate: null,
        booked: 0, closes: 0, claimed: 0, claimedClosed: 0, closeRate: null,
        avgSpeedSeconds: null, speedLeads: 0,
      };
      people.set(id, row);
    }
    return row;
  };
  for (const m of members) person(m.id, m.name);
  for (const r of board) {
    if (r.actor_id === null) continue;
    const row = person(r.actor_id, r.name);
    Object.assign(row, {
      dials: r.dials,
      leadsCalled: r.leads_called,
      answered: r.answered,
      booked: r.booked,
      closes: r.closes,
    });
  }
  for (const c of claims) {
    const row = person(c.id, c.name);
    row.claimed = c.claimed;
    row.claimedClosed = c.closed;
  }
  for (const r of speed) {
    const row = people.get(r.id);
    if (row) {
      row.avgSpeedSeconds = r.avg_s;
      row.speedLeads = r.n;
    }
  }
  const leaderboard = [...people.values()]
    .map((r) => ({
      ...r,
      answerRate: r.leadsCalled > 0 ? r.answered / r.leadsCalled : null,
      closeRate: r.claimed > 0 ? r.claimedClosed / r.claimed : null,
    }))
    .sort((a, b) => b.closes - a.closes || b.booked - a.booked || b.dials - a.dials);

  const all = board.find((r) => r.actor_id === null);
  const t = optIns?.total;
  const team: TeamSummary = {
    optIns: t ? t.total : null,
    dials: all?.dials ?? 0,
    leadsCalled: all?.leads_called ?? 0,
    answered: all?.answered ?? 0,
    answerRate: all && all.leads_called > 0 ? all.answered / all.leads_called : null,
    booked: all?.booked ?? 0,
    closes: all?.closes ?? 0,
    bookRate: all && all.answered > 0 ? all.booked / all.answered : null,
    closeRate: all && all.booked > 0 ? all.closes / all.booked : null,
    avgFirstContactSeconds: t?.avgFirstContactSeconds ?? null,
    within5Rate: t && t.total > 0 ? t.within5 / t.total : null,
    waiting: t ? t.waiting : null,
  };

  if (!owner) return { range, team, leaderboard, optIns: null, adFunnel: null, campaigns: null, dial: null };
  return { range, team, leaderboard, optIns, adFunnel, campaigns, dial };
}
