import "server-only";

import { createHash } from "node:crypto";

import { query } from "./db";
import { batchTotals, partnerBatches } from "./partnerBatches";
import { demoEventRows, isDemoId } from "./partnerDemo";
import { payoutSummary } from "./payoutDetails";
import { hashPassword, MIN_PASSWORD_LENGTH, passwordMatches } from "./users";

// Mad Media partners (Nov 16 2026). A partner sells Base44 with the owner's
// AffiliateConsulting links plus their own subid
// (https://re.aistorebuilder.com/base44?subid=THEIRS). AffiliateConsulting
// posts every sign-up / purchase / reversal on the owner's account to
// /api/partner-webhook; events whose subid matches a partner go on that
// partner's dashboard (/partner), everything else stays the owner's.
// The webhook's exact JSON fields aren't documented, so fields are found by
// name anywhere in the body and the whole body is kept in `raw`.

export type PartnerStatus = "pending" | "active" | "disabled";
export const PLAN_KEYS = ["builder_monthly", "builder_yearly", "starter_monthly", "starter_yearly"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];
export type Rates = Record<PlanKey, number>;

export const PLAN_LABEL: Record<PlanKey, [string, string]> = {
  builder_monthly: ["Builder", "Monthly"],
  builder_yearly: ["Builder", "Yearly"],
  starter_monthly: ["Starter", "Monthly"],
  starter_yearly: ["Starter", "Yearly"],
};
// What AffiliateConsulting pays the owner per sale (from the owner's "Your
// links" page, Nov 16 2026). Used to tell the plan from the payout when the
// event doesn't name it.
const OWNER_PAYOUT: Partial<Record<number, PlanKey>> = { 225: "builder_monthly", 250: "starter_yearly", 475: "builder_yearly" };

export const LINK_BASES = [
  { label: "Base44", url: "https://re.aistorebuilder.com/base44" },
  { label: "Base44 Pricing", url: "https://re.aistorebuilder.com/base44-pricing" },
];
// The owner's own AffiliateConsulting sub-ID: it is what credits the owner's
// account, so every partner link keeps it.
export const OWNER_SUBID = process.env.PARTNER_OWNER_SUBID || "mad-media";
// A partner's links (AffiliateConsulting's "Tracking Sales by Setter" format,
// confirmed Nov 16 2026): the owner's link + &sharedid=<partner's Shared ID>.
// AffiliateConsulting sends that back as the webhook's shared_id, which is
// matched against crm_partners.subid. While link_subid is set (old manual
// mode) the link is just ?subid=<link_subid> and sales are assigned by hand.
export function partnerLinksFor(p: { subid: string | null; linkSubid: string | null }) {
  const q = p.linkSubid
    ? `subid=${encodeURIComponent(p.linkSubid)}`
    : p.subid
      ? `subid=${encodeURIComponent(OWNER_SUBID)}&sharedid=${encodeURIComponent(p.subid)}`
      : null;
  return q ? LINK_BASES.map((l) => ({ label: l.label, url: `${l.url}?${q}` })) : [];
}

type PartnerRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  status: PartnerStatus;
  subid: string | null;
  link_subid: string | null;
  rates: Partial<Rates>;
  created_at: string | Date;
  approved_at: string | Date | null;
  last_login_at: string | Date | null;
};

export type Partner = {
  id: string;
  email: string;
  name: string;
  status: PartnerStatus;
  subid: string | null;
  linkSubid: string | null;
  rates: Rates;
  createdAt: string;
  lastLoginAt: string | null;
};

const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString());
const fullRates = (r: Partial<Rates> | null | undefined): Rates =>
  Object.fromEntries(PLAN_KEYS.map((k) => [k, Number(r?.[k]) || 0])) as Rates;

function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    subid: row.subid,
    linkSubid: row.link_subid,
    rates: fullRates(row.rates),
    createdAt: iso(row.created_at)!,
    lastLoginAt: iso(row.last_login_at),
  };
}

export const cleanSubid = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);

// ---- accounts ---------------------------------------------------------------

export async function createPartner(name: string, email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().slice(0, 100);
  if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanEmail.length > 200 || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return "invalid" as const;
  }
  const [{ pending }] = await query<{ pending: number }>(`SELECT count(*)::int AS pending FROM crm_partners WHERE status = 'pending'`);
  if (pending >= 20) return "full" as const;
  const rows = await query(
    `INSERT INTO crm_partners (email, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [cleanEmail, cleanName, await hashPassword(password)]
  );
  return rows.length > 0 ? ("created" as const) : ("exists" as const);
}

export async function checkPartnerLogin(email: string, password: string) {
  const rows = await query<PartnerRow>(`SELECT * FROM crm_partners WHERE email = $1`, [email.trim().toLowerCase()]);
  const row = rows[0];
  if (!row || !(await passwordMatches(password, row.password_hash))) return { ok: false as const, reason: "wrong" as const };
  if (row.status !== "active") return { ok: false as const, reason: row.status };
  await query(`UPDATE crm_partners SET last_login_at = now() WHERE id = $1`, [row.id]);
  return { ok: true as const, id: row.id };
}

export async function getActivePartner(id: string): Promise<Partner | null> {
  const rows = await query<PartnerRow>(`SELECT * FROM crm_partners WHERE id = $1 AND status = 'active'`, [id]);
  return rows[0] ? toPartner(rows[0]) : null;
}

// Owner: approve / change subid and rates. A new subid also claims any events
// already received with it.
export async function updatePartner(
  id: string,
  change: { subid?: string; linkSubid?: string; rates?: Rates; status?: PartnerStatus; applyToPast?: boolean }
): Promise<Partner | "subid_taken" | null> {
  const current = (await query<PartnerRow>(`SELECT * FROM crm_partners WHERE id = $1`, [id]))[0];
  if (!current) return null;
  const subid = change.subid !== undefined ? cleanSubid(change.subid) || null : current.subid;
  if (subid && subid === OWNER_SUBID) return "subid_taken"; // the owner's own sub-ID
  if (subid && subid !== current.subid) {
    const taken = await query(`SELECT 1 FROM crm_partners WHERE subid = $1 AND id <> $2`, [subid, id]);
    if (taken.length) return "subid_taken";
  }
  const linkSub = change.linkSubid !== undefined ? cleanSubid(change.linkSubid) || null : current.link_subid;
  const rates = change.rates ? fullRates(change.rates) : fullRates(current.rates);
  const status = change.status ?? current.status;
  const rows = await query<PartnerRow>(
    `UPDATE crm_partners SET subid = $2, rates = $3::jsonb, status = $4, link_subid = $5,
       approved_at = CASE WHEN $4 = 'active' AND approved_at IS NULL THEN now() ELSE approved_at END
     WHERE id = $1 RETURNING *`,
    [id, subid, JSON.stringify(rates), status, linkSub]
  );
  if (subid !== current.subid) {
    await query(`UPDATE crm_partner_events SET partner_id = NULL WHERE partner_id = $1 AND NOT assigned_manually`, [id]);
    if (subid) await query(`UPDATE crm_partner_events SET partner_id = $1 WHERE subid = $2 AND NOT assigned_manually`, [id, subid]);
    await recalcCommissions(id, rates, true);
  } else if (change.rates && change.applyToPast) {
    await recalcCommissions(id, rates, true);
  }
  return rows[0] ? toPartner(rows[0]) : null;
}

async function recalcCommissions(partnerId: string, rates: Rates, all: boolean) {
  if (!all) return;
  const events = await query<{ id: string; kind: string; plan_key: string }>(
    `SELECT id, kind, plan_key FROM crm_partner_events WHERE partner_id = $1`,
    [partnerId]
  );
  for (const e of events) {
    const amount = rates[e.plan_key as PlanKey] ?? 0;
    const commission = e.kind === "purchase" ? amount : e.kind === "reversal" ? -amount : 0;
    await query(`UPDATE crm_partner_events SET commission = $2 WHERE id = $1`, [e.id, commission]);
  }
}

export async function deletePartner(id: string) {
  const rows = await query(`DELETE FROM crm_partners WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) return false;
  await query(`UPDATE crm_partner_events SET partner_id = NULL WHERE partner_id = $1`, [id]);
  await query(`DELETE FROM crm_partner_payouts WHERE partner_id = $1`, [id]);
  return true;
}

export async function addPartnerPayout(id: string, amount: number, note: string) {
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return false;
  const exists = await query(`SELECT 1 FROM crm_partners WHERE id = $1`, [id]);
  if (!exists.length) return false;
  await query(`INSERT INTO crm_partner_payouts (partner_id, amount, note) VALUES ($1, $2, $3)`, [id, amount, note.slice(0, 200)]);
  return true;
}

// ---- webhook ingest ---------------------------------------------------------

type Json = unknown;

// Every [key, value] pair in the body, nested objects included.
function flatten(value: Json, out: [string, Json][] = [], depth = 0): [string, Json][] {
  if (depth > 6 || !value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value as Record<string, Json>)) {
    out.push([k.toLowerCase().replace(/[^a-z0-9]/g, ""), v]);
    if (v && typeof v === "object") flatten(v, out, depth + 1);
  }
  return out;
}

const scalar = (v: Json) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

function pick(pairs: [string, Json][], test: (key: string) => boolean): string {
  for (const [k, v] of pairs) if (test(k) && scalar(v)) return scalar(v);
  return "";
}

export function readEvent(body: Json, eventName = "") {
  const pairs = flatten(body);
  const typeText = eventName.toLowerCase() || pick(pairs, (k) => ["event", "type", "eventtype", "eventname", "kind", "action", "actiontype"].includes(k)).toLowerCase();
  const all = JSON.stringify(body).toLowerCase();
  const kind = /revers|refund|chargeback|reversed/.test(typeText)
    ? "reversal"
    : /purchase|sale|conversion|order/.test(typeText)
      ? "purchase"
      : /sign.?up|lead|registration|register/.test(typeText)
        ? "signup"
        : /revers|refund/.test(all)
          ? "reversal"
          : /purchase/.test(all)
            ? "purchase"
            : /sign.?up/.test(all)
              ? "signup"
              : "unknown";
  // Sub-ids: subid, sub_id, subId1, SubId1, sub1 ... (every one, any of them can match)
  const subids = pairs
    .filter(([k]) => /^(subid\d*|sub\d|sharedid|subaffiliateid|trackingid|clickref)$/.test(k))
    .map(([, v]) => cleanSubid(scalar(v)))
    .filter(Boolean);
  const planText = pick(pairs, (k) => ["plan", "planname", "product", "productname", "sku", "item", "itemname", "tier"].includes(k)).toLowerCase();
  const billingText = pick(pairs, (k) => /billing|interval|period|cycle/.test(k)).toLowerCase();
  const payout = Number(pick(pairs, (k) => ["commission", "payout", "earnings", "amount", "affiliatepayout", "yourearnings"].includes(k)).replace(/[^0-9.-]/g, "")) || 0;
  // AffiliateConsulting's events have no plan name, only billing_period
  // ("monthly"/"yearly") and the owner's commission, so the plan comes from
  // those: the known payout amounts first, then the billing period.
  let planKey: PlanKey | "" = "";
  const tier = /builder/.test(planText) ? "builder" : /starter/.test(planText) ? "starter" : "";
  const yearly = /year|annual/.test(billingText || planText);
  const amount = Math.abs(payout);
  if (tier) planKey = `${tier}_${yearly ? "yearly" : "monthly"}` as PlanKey;
  else if (OWNER_PAYOUT[amount]) planKey = OWNER_PAYOUT[amount]!;
  else if (billingText) planKey = yearly ? (amount >= 400 ? "builder_yearly" : "starter_yearly") : amount > 0 ? "builder_monthly" : "starter_monthly";
  const country = pick(pairs, (k) => ["country", "countrycode", "customercountry"].includes(k)).slice(0, 60);
  const orderRef = pick(pairs, (k) => ["orderid", "oid", "transactionid", "actionid", "conversionid", "purchaseid", "originalid"].includes(k)).slice(0, 120);
  const extId = pick(pairs, (k) => ["id", "eventid", "webhookid", "deliveryid"].includes(k));
  const when = pick(pairs, (k) => ["occurredat", "createdat", "eventdate", "timestamp", "date", "time", "eventtime"].includes(k));
  const parsed = when ? new Date(/^\d{10}$/.test(when) ? Number(when) * 1000 : /^\d{13}$/.test(when) ? Number(when) : when) : null;
  const occurredAt = parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now() + 86400000 ? parsed : new Date();
  return { kind, subids, planKey, payout, country, orderRef, extId, occurredAt };
}

// meta: AffiliateConsulting's X-AC-Event (event name) and X-AC-Delivery
// (delivery id; retries reuse it) headers, when present.
export async function ingestEvent(body: Json, rawText: string, meta: { event?: string; delivery?: string } = {}) {
  const e = readEvent(body, meta.event ?? "");
  const extId = meta.delivery
    ? `delivery:${meta.delivery.slice(0, 200)}`
    : e.extId
      ? `${e.kind}:${e.extId}`
      : `hash:${createHash("sha256").update(rawText).digest("hex")}`;
  let partner: PartnerRow | undefined;
  // The partner's tag usually rides on the end of the owner's sub-ID
  // ("mad-media-henry"); if AffiliateConsulting ever reports the two parts
  // as separate values (subid "mad-media", shared_id "henry"), try them
  // joined too.
  const candidates = [...e.subids];
  for (const a of e.subids) for (const b of e.subids) if (a !== b) candidates.push(cleanSubid(`${a}-${b}`));
  for (const s of candidates) {
    partner = (await query<PartnerRow>(`SELECT * FROM crm_partners WHERE subid = $1`, [s]))[0];
    if (partner) break;
  }
  const subid = partner?.subid ?? e.subids[0] ?? "";
  let commission = 0;
  if (partner) {
    const rates = fullRates(partner.rates);
    if (e.kind === "purchase") commission = e.planKey ? rates[e.planKey] : 0;
    if (e.kind === "reversal") {
      // Take back what the original sale earned when it can be found, but only
      // if the cancel/refund came within REVERSAL_WINDOW_DAYS of that sale.
      const original = e.orderRef
        ? (await query<{ commission: string; occurred_at: string | Date }>(
            `SELECT commission, occurred_at FROM crm_partner_events WHERE partner_id = $1 AND kind = 'purchase' AND order_ref = $2 LIMIT 1`,
            [partner.id, e.orderRef]
          ))[0]
        : undefined;
      commission = original
        ? withinWindow(original.occurred_at, e.occurredAt) ? -Number(original.commission) : 0
        : e.planKey ? -rates[e.planKey] : 0;
    }
  }
  const rows = await query(
    `INSERT INTO crm_partner_events (ext_id, kind, subid, partner_id, plan_key, country, order_ref, payout, commission, occurred_at, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     ON CONFLICT (ext_id) DO NOTHING RETURNING id`,
    [extId, e.kind, subid, partner?.id ?? null, e.planKey, e.country, e.orderRef, e.payout, commission, e.occurredAt.toISOString(), JSON.stringify(body ?? {})]
  );
  return { stored: rows.length > 0, kind: e.kind, matched: Boolean(partner) };
}

// ---- dashboards -------------------------------------------------------------

// Owner's rule (Nov 21 2026): a cancel or refund only takes the commission back
// when it happens within 14 days of the sale; after that the affiliate keeps it.
export const REVERSAL_WINDOW_DAYS = 14;
const withinWindow = (sale: string | Date, reversal: string | Date) =>
  new Date(reversal).getTime() - new Date(sale).getTime() <= REVERSAL_WINDOW_DAYS * 86_400_000;

export type PartnerEvent = { kind: string; planKey: string; country: string; commission: number; at: string };

export async function partnerEvents(partnerId: string): Promise<PartnerEvent[]> {
  if (isDemoId(partnerId)) {
    return (await demoEventRows()).map((r) => ({ kind: r.kind, planKey: r.plan_key, country: r.country, commission: r.commission, at: r.occurred_at.toISOString() }));
  }
  const rows = await query<{ kind: string; plan_key: string; country: string; commission: string; occurred_at: string | Date }>(
    `SELECT kind, plan_key, country, commission, occurred_at FROM crm_partner_events
     WHERE partner_id = $1 ORDER BY occurred_at`,
    [partnerId]
  );
  return rows.map((r) => ({ kind: r.kind, planKey: r.plan_key, country: r.country, commission: Number(r.commission), at: iso(r.occurred_at)! }));
}

export async function partnerPayouts(partnerId: string) {
  if (isDemoId(partnerId)) return [];
  const rows = await query<{ amount: string; note: string; created_at: string | Date }>(
    `SELECT amount, note, created_at FROM crm_partner_payouts WHERE partner_id = $1 ORDER BY created_at DESC`,
    [partnerId]
  );
  return rows.map((r) => ({ amount: Number(r.amount), note: r.note, at: iso(r.created_at)! }));
}

export async function partnerTotals(partnerId: string) {
  if (isDemoId(partnerId)) {
    const events = await partnerEvents(partnerId);
    const earned = Math.round(events.reduce((s, e) => s + e.commission, 0) * 100) / 100;
    const { paid } = batchTotals(await partnerBatches(partnerId));
    return { earned, paid, pending: 0, owed: Math.round((earned - paid) * 100) / 100 };
  }
  // paid = batches marked paid + any one-off payouts the owner recorded;
  // pending = batches approved but not paid yet.
  const [row] = await query<{ earned: string; paid: string; pending: string }>(
    `SELECT (SELECT coalesce(sum(commission), 0) FROM crm_partner_events WHERE partner_id = $1) AS earned,
            (SELECT coalesce(sum(amount), 0) FROM crm_partner_payouts WHERE partner_id = $1)
              + (SELECT coalesce(sum(amount), 0) FROM crm_partner_payout_batches WHERE partner_id = $1 AND status = 'paid') AS paid,
            (SELECT coalesce(sum(amount), 0) FROM crm_partner_payout_batches WHERE partner_id = $1 AND status = 'approved') AS pending`,
    [partnerId]
  );
  const earned = Number(row.earned), paid = Number(row.paid), pending = Number(row.pending);
  return { earned, paid, pending, owed: earned - paid };
}

// Owner view: every partner with totals, plus the latest events (all subids).
export async function listPartnersForOwner() {
  const rows = await query<PartnerRow>(`SELECT * FROM crm_partners ORDER BY (status = 'pending') DESC, created_at DESC`);
  const partners = [];
  for (const row of rows) {
    const p = toPartner(row);
    const [counts] = await query<{ signups: number; purchases: number; reversals: number }>(
      `SELECT count(*) FILTER (WHERE kind = 'signup')::int AS signups,
              count(*) FILTER (WHERE kind = 'purchase')::int AS purchases,
              count(*) FILTER (WHERE kind = 'reversal')::int AS reversals
       FROM crm_partner_events WHERE partner_id = $1`,
      [p.id]
    );
    partners.push({
      ...p,
      links: partnerLinksFor(p),
      counts,
      totals: await partnerTotals(p.id),
      payouts: await partnerPayouts(p.id),
      payoutMethod: await payoutSummary(p.id),
      batches: (await partnerBatches(p.id)).filter((b) => b.status !== "carried").slice(0, 12),
    });
  }
  const events = await query<{ id: string; kind: string; subid: string; plan_key: string; payout: string; commission: string; occurred_at: string | Date; partner: string | null; partner_id: string | null; assigned_manually: boolean; test: boolean }>(
    `SELECT e.id, e.kind, e.subid, e.plan_key, e.payout, e.commission, e.occurred_at, p.name AS partner, e.partner_id, e.assigned_manually,
            coalesce((e.raw->>'test')::boolean, false) AS test
     FROM crm_partner_events e LEFT JOIN crm_partners p ON p.id = e.partner_id
     ORDER BY e.occurred_at DESC LIMIT 200`
  );
  return {
    partners,
    events: events.map((e) => ({
      id: String(e.id),
      partnerId: e.partner_id,
      manual: e.assigned_manually,
      test: e.test,
      kind: e.kind,
      subid: e.subid,
      plan: e.plan_key ? PLAN_LABEL[e.plan_key as PlanKey]?.join(" ") ?? e.plan_key : "",
      payout: Number(e.payout),
      commission: Number(e.commission),
      at: iso(e.occurred_at)!,
      partner: e.partner,
    })),
  };
}

// Owner: give an event to a partner (or back to the owner with null) by hand.
// Commission follows the partner's current rates; a reversal takes back what
// the matching sale earned when it can be found.
export async function assignEvent(eventId: string, partnerId: string | null) {
  const ev = (await query<{ id: string; kind: string; plan_key: string; order_ref: string; occurred_at: string | Date }>(
    `SELECT id, kind, plan_key, order_ref, occurred_at FROM crm_partner_events WHERE id = $1`,
    [eventId]
  ))[0];
  if (!ev) return "not_found" as const;
  if (!partnerId) {
    await query(`UPDATE crm_partner_events SET partner_id = NULL, commission = 0, assigned_manually = true WHERE id = $1`, [eventId]);
    return "ok" as const;
  }
  const partner = (await query<PartnerRow>(`SELECT * FROM crm_partners WHERE id = $1`, [partnerId]))[0];
  if (!partner) return "no_partner" as const;
  const rates = fullRates(partner.rates);
  const rate = ev.plan_key ? rates[ev.plan_key as PlanKey] ?? 0 : 0;
  let commission = 0;
  if (ev.kind === "purchase") commission = rate;
  if (ev.kind === "reversal") {
    const original = ev.order_ref
      ? (await query<{ commission: string; occurred_at: string | Date }>(
          `SELECT commission, occurred_at FROM crm_partner_events WHERE partner_id = $1 AND kind = 'purchase' AND order_ref = $2 LIMIT 1`,
          [partnerId, ev.order_ref]
        ))[0]
      : undefined;
    commission = original ? (withinWindow(original.occurred_at, ev.occurred_at) ? -Number(original.commission) : 0) : -rate;
  }
  await query(`UPDATE crm_partner_events SET partner_id = $2, commission = $3, assigned_manually = true WHERE id = $1`, [eventId, partnerId, commission]);
  return "ok" as const;
}

// The raw body of the newest event, so the owner can check what fields
// AffiliateConsulting really sends.
export async function latestRawEvent() {
  const rows = await query<{ raw: unknown }>(`SELECT raw FROM crm_partner_events ORDER BY received_at DESC LIMIT 1`);
  return rows[0]?.raw ?? null;
}
