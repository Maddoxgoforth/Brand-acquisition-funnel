import "server-only";

import { CLOSE_PLANS, type ClosePlan } from "./constants";
import { query } from "./db";
import { hashPassword, MIN_PASSWORD_LENGTH, passwordMatches } from "./users";

// Affiliates: UGC creators who send people to the organic free-course page
// with their own link (https://www.brandacquisition.co/?ref=CODE). Leads their
// link creates are tagged with the affiliate; when one of those leads is moved
// to Closed, the affiliate earns the commission the owner set for that plan.
// Affiliates only ever see counts and plans, never who the leads are.

export type AffiliateStatus = "pending" | "active" | "disabled";
export type AffiliateRate = { monthly: number; yearly: number; builderYearly: number };

type AffiliateRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  status: AffiliateStatus;
  code: string | null;
  created_at: string | Date;
  approved_at: string | Date | null;
  last_login_at: string | Date | null;
};

export type Affiliate = {
  id: string;
  email: string;
  name: string;
  status: AffiliateStatus;
  code: string | null;
  createdAt: string;
  approvedAt: string | null;
  lastLoginAt: string | null;
};

const MAX_PENDING = 50;
const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString());

function toAffiliate(row: AffiliateRow): Affiliate {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    code: row.code,
    createdAt: iso(row.created_at)!,
    approvedAt: iso(row.approved_at),
    lastLoginAt: iso(row.last_login_at),
  };
}

export const SITE_URL = "https://www.brandacquisition.co";
export const affiliateLink = (code: string) => `${SITE_URL}/?ref=${encodeURIComponent(code)}`;

// ---- accounts ---------------------------------------------------------------

export type AffiliateSignupResult = "created" | "exists" | "invalid" | "full";

export async function createAffiliate(
  name: string,
  email: string,
  password: string
): Promise<AffiliateSignupResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().slice(0, 100);
  if (
    !cleanName ||
    !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
    cleanEmail.length > 200 ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > 200
  ) {
    return "invalid";
  }
  const [{ pending }] = await query<{ pending: number }>(
    `SELECT count(*)::int AS pending FROM crm_affiliates WHERE status = 'pending'`
  );
  if (pending >= MAX_PENDING) return "full";
  const rows = await query(
    `INSERT INTO crm_affiliates (email, name, password_hash)
     VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [cleanEmail, cleanName, await hashPassword(password)]
  );
  return rows.length > 0 ? "created" : "exists";
}

export type AffiliateLoginResult =
  | { ok: true; id: string }
  | { ok: false; reason: "wrong" | "pending" | "disabled" };

export async function checkAffiliateLogin(email: string, password: string): Promise<AffiliateLoginResult> {
  const rows = await query<AffiliateRow>(`SELECT * FROM crm_affiliates WHERE email = $1`, [
    email.trim().toLowerCase(),
  ]);
  const row = rows[0];
  if (!row || !(await passwordMatches(password, row.password_hash))) return { ok: false, reason: "wrong" };
  if (row.status !== "active") return { ok: false, reason: row.status };
  await query(`UPDATE crm_affiliates SET last_login_at = now() WHERE id = $1`, [row.id]);
  return { ok: true, id: row.id };
}

export async function getActiveAffiliate(id: string): Promise<Affiliate | null> {
  const rows = await query<AffiliateRow>(
    `SELECT * FROM crm_affiliates WHERE id = $1 AND status = 'active'`,
    [id]
  );
  return rows[0] ? toAffiliate(rows[0]) : null;
}

// A link code from their name: "Jake Smith" -> "jakesmith", "jakesmith2", ...
async function uniqueCode(name: string) {
  const base = (name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "") || "partner").slice(0, 20);
  for (let n = 1; n < 1000; n++) {
    const code = n === 1 ? base : `${base}${n}`;
    const taken = await query(`SELECT 1 FROM crm_affiliates WHERE code = $1`, [code]);
    if (taken.length === 0) return code;
  }
  return `${base}${Date.now().toString(36)}`;
}

const cleanRate = (r: AffiliateRate): AffiliateRate => ({
  monthly: Math.max(0, Math.min(100000, Math.round(Number(r.monthly) || 0))),
  yearly: Math.max(0, Math.min(100000, Math.round(Number(r.yearly) || 0))),
  builderYearly: Math.max(0, Math.min(100000, Math.round(Number(r.builderYearly) || 0))),
});

// Approve: give them a link code and their first rate (covers every close).
export async function approveAffiliate(id: string, rate: AffiliateRate): Promise<Affiliate | null> {
  const rows = await query<AffiliateRow>(`SELECT * FROM crm_affiliates WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const code = rows[0].code ?? (await uniqueCode(rows[0].name));
  const updated = await query<AffiliateRow>(
    `UPDATE crm_affiliates SET status = 'active', code = $2, approved_at = coalesce(approved_at, now())
     WHERE id = $1 RETURNING *`,
    [id, code]
  );
  const hasRate = await query(`SELECT 1 FROM crm_affiliate_rates WHERE affiliate_id = $1`, [id]);
  if (hasRate.length === 0) await setAffiliateRate(id, rate, true);
  return updated[0] ? toAffiliate(updated[0]) : null;
}

export async function setAffiliateStatus(id: string, status: "active" | "disabled") {
  const rows = await query<AffiliateRow>(
    `UPDATE crm_affiliates SET status = $2 WHERE id = $1 AND code IS NOT NULL RETURNING *`,
    [id, status]
  );
  return rows[0] ? toAffiliate(rows[0]) : null;
}

// A new rate counts for closes from now on, unless applyToPast.
export async function setAffiliateRate(id: string, rate: AffiliateRate, applyToPast: boolean) {
  const r = cleanRate(rate);
  if (applyToPast) await query(`DELETE FROM crm_affiliate_rates WHERE affiliate_id = $1`, [id]);
  await query(
    `INSERT INTO crm_affiliate_rates (affiliate_id, monthly, yearly, builder_yearly, effective_from)
     VALUES ($1, $2, $3, $4, ${applyToPast ? "NULL" : "now()"})`,
    [id, r.monthly, r.yearly, r.builderYearly]
  );
}

export async function deleteAffiliate(id: string) {
  // Their leads keep the copied name; only the link to the account goes.
  await query(`UPDATE crm_leads SET affiliate_id = NULL WHERE affiliate_id = $1`, [id]);
  await query(`DELETE FROM crm_affiliate_rates WHERE affiliate_id = $1`, [id]);
  await query(`DELETE FROM crm_affiliate_payouts WHERE affiliate_id = $1`, [id]);
  const rows = await query(`DELETE FROM crm_affiliates WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function addAffiliatePayout(id: string, amount: number, note: string) {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) > 1000000) return false;
  await query(`INSERT INTO crm_affiliate_payouts (affiliate_id, amount, note) VALUES ($1, $2, $3)`, [
    id,
    value,
    note.trim().slice(0, 200),
  ]);
  return true;
}

// ---- tracking -----------------------------------------------------------------

export async function activeAffiliateByCode(code: string): Promise<Affiliate | null> {
  const clean = code.trim().toLowerCase().slice(0, 40);
  if (!clean) return null;
  const rows = await query<AffiliateRow>(
    `SELECT * FROM crm_affiliates WHERE code = $1 AND status = 'active'`,
    [clean]
  );
  return rows[0] ? toAffiliate(rows[0]) : null;
}

// Tag leads that were just created by an opt-in through this affiliate's link.
// Leads that were already in the CRM (re-opt-ins) are never re-assigned.
export async function attributeLeads(code: string, leadIds: string[]) {
  if (leadIds.length === 0) return;
  const affiliate = await activeAffiliateByCode(code);
  if (!affiliate) return;
  await query(
    `UPDATE crm_leads SET affiliate_id = $1, affiliate_name = $2
     WHERE id = ANY($3::uuid[]) AND affiliate_id IS NULL
       AND created_at > now() - interval '10 minutes'`,
    [affiliate.id, affiliate.name, leadIds]
  );
}

// ---- numbers --------------------------------------------------------------------

type CloseRow = {
  lead_id: string;
  lead_name: string;
  close_plan: ClosePlan | null;
  closed_at: string | Date;
  commission: number;
};

// Every close from an affiliate's leads, with the commission at the rate that
// applied when it closed.
async function affiliateCloses(ids: string[], fromIso: string | null, toIso: string | null) {
  return query<CloseRow & { affiliate_id: string }>(
    `SELECT l.affiliate_id, l.id AS lead_id, l.name AS lead_name, l.close_plan, l.closed_at,
            coalesce(CASE l.close_plan
              WHEN 'monthly' THEN r.monthly
              WHEN 'yearly' THEN r.yearly
              WHEN 'builder_yearly' THEN r.builder_yearly END, 0)::int AS commission
     FROM crm_leads l
     LEFT JOIN LATERAL (
       SELECT * FROM crm_affiliate_rates r
       WHERE r.affiliate_id = l.affiliate_id
         AND (r.effective_from IS NULL OR r.effective_from <= coalesce(l.closed_at, now()))
       ORDER BY r.effective_from DESC NULLS LAST, r.id DESC LIMIT 1
     ) r ON true
     WHERE l.affiliate_id = ANY($1::uuid[]) AND l.status = 'closed'
       AND ($2::timestamptz IS NULL OR l.closed_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR l.closed_at < $3::timestamptz)
     ORDER BY l.closed_at DESC NULLS LAST`,
    [ids, fromIso, toIso]
  );
}

export type PlanCount = { plan: ClosePlan; label: string; closes: number; earned: number };

export type AffiliateNumbers = {
  visitors: number;
  optIns: number;
  closes: number;
  closeRate: number | null;
  earned: number;
  plans: PlanCount[];
};

export type AffiliateTotals = { earned: number; paid: number; owed: number };

async function numbersFor(ids: string[], codes: string[], fromIso: string | null, toIso: string | null) {
  const [visitors, optIns, closes] = await Promise.all([
    query<{ code: string; n: number }>(
      `SELECT campaign AS code, count(DISTINCT visitor_id)::int AS n FROM site_events
       WHERE funnel = 'affiliate' AND step = 'view' AND campaign = ANY($1::text[])
         AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR created_at < $3::timestamptz)
       GROUP BY campaign`,
      [codes, fromIso, toIso]
    ),
    query<{ affiliate_id: string; n: number }>(
      `SELECT affiliate_id, count(*)::int AS n FROM crm_leads
       WHERE affiliate_id = ANY($1::uuid[])
         AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR created_at < $3::timestamptz)
       GROUP BY affiliate_id`,
      [ids, fromIso, toIso]
    ),
    affiliateCloses(ids, fromIso, toIso),
  ]);
  return { visitors, optIns, closes };
}

function summarize(
  visitors: number,
  optIns: number,
  closes: CloseRow[]
): AffiliateNumbers {
  const plans = CLOSE_PLANS.map((p) => {
    const mine = closes.filter((c) => c.close_plan === p.id);
    return { plan: p.id, label: p.label, closes: mine.length, earned: mine.reduce((s, c) => s + c.commission, 0) };
  });
  return {
    visitors,
    optIns,
    closes: closes.length,
    closeRate: optIns > 0 ? closes.length / optIns : null,
    earned: closes.reduce((s, c) => s + c.commission, 0),
    plans,
  };
}

async function totals(ids: string[]) {
  const [all, paid] = await Promise.all([
    affiliateCloses(ids, null, null),
    query<{ affiliate_id: string; paid: number }>(
      `SELECT affiliate_id, coalesce(sum(amount), 0)::int AS paid FROM crm_affiliate_payouts
       WHERE affiliate_id = ANY($1::uuid[]) GROUP BY affiliate_id`,
      [ids]
    ),
  ]);
  return (id: string): AffiliateTotals => {
    const earned = all.filter((c) => c.affiliate_id === id).reduce((s, c) => s + c.commission, 0);
    const p = paid.find((r) => r.affiliate_id === id)?.paid ?? 0;
    return { earned, paid: p, owed: earned - p };
  };
}

async function currentRates(ids: string[]) {
  const rows = await query<{ affiliate_id: string; monthly: number; yearly: number; builder_yearly: number }>(
    `SELECT DISTINCT ON (affiliate_id) affiliate_id, monthly, yearly, builder_yearly
     FROM crm_affiliate_rates WHERE affiliate_id = ANY($1::uuid[])
     ORDER BY affiliate_id, effective_from DESC NULLS LAST, id DESC`,
    [ids]
  );
  return (id: string): AffiliateRate | null => {
    const r = rows.find((x) => x.affiliate_id === id);
    return r ? { monthly: r.monthly, yearly: r.yearly, builderYearly: r.builder_yearly } : null;
  };
}

// What the affiliate sees: counts, plans and money only. No lead details.
export async function affiliateDashboard(affiliate: Affiliate, fromIso: string | null, toIso: string | null) {
  const ids = [affiliate.id];
  const codes = affiliate.code ? [affiliate.code] : [];
  const [{ visitors, optIns, closes }, total, rate] = await Promise.all([
    numbersFor(ids, codes, fromIso, toIso),
    totals(ids),
    currentRates(ids),
  ]);
  return {
    link: affiliate.code ? affiliateLink(affiliate.code) : null,
    rate: rate(affiliate.id),
    numbers: summarize(visitors[0]?.n ?? 0, optIns[0]?.n ?? 0, closes),
    totals: total(affiliate.id),
    recent: closes.slice(0, 25).map((c) => ({
      closedAt: iso(c.closed_at),
      plan: CLOSE_PLANS.find((p) => p.id === c.close_plan)?.label ?? "Closed",
      commission: c.commission,
    })),
  };
}

// The owner's view: every affiliate with their numbers, and which leads closed.
export async function listAffiliatesForOwner(fromIso: string | null, toIso: string | null) {
  const rows = await query<AffiliateRow>(
    `SELECT * FROM crm_affiliates ORDER BY (status = 'pending') DESC, created_at DESC`
  );
  const list = rows.map(toAffiliate);
  const ids = list.map((a) => a.id);
  const codes = list.flatMap((a) => (a.code ? [a.code] : []));
  const [{ visitors, optIns, closes }, total, rate, payouts] = await Promise.all([
    numbersFor(ids, codes, fromIso, toIso),
    totals(ids),
    currentRates(ids),
    query<{ affiliate_id: string; amount: number; note: string; created_at: string | Date }>(
      `SELECT affiliate_id, amount, note, created_at FROM crm_affiliate_payouts
       WHERE affiliate_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [ids]
    ),
  ]);
  return list.map((a) => {
    const mine = closes.filter((c) => c.affiliate_id === a.id);
    return {
      ...a,
      link: a.code ? affiliateLink(a.code) : null,
      rate: rate(a.id),
      numbers: summarize(
        visitors.find((v) => v.code === a.code)?.n ?? 0,
        optIns.find((o) => o.affiliate_id === a.id)?.n ?? 0,
        mine
      ),
      totals: total(a.id),
      closes: mine.map((c) => ({
        leadId: c.lead_id,
        leadName: c.lead_name,
        plan: CLOSE_PLANS.find((p) => p.id === c.close_plan)?.label ?? "Closed",
        closedAt: iso(c.closed_at),
        commission: c.commission,
      })),
      payouts: payouts
        .filter((p) => p.affiliate_id === a.id)
        .map((p) => ({ amount: p.amount, note: p.note, at: iso(p.created_at)! })),
    };
  });
}

// ---- owner demo ------------------------------------------------------------------

// Owner's request Nov 21 2026: a preview of the affiliate dashboard filled with
// the owner's own sales from his main link (organic free-course opt-ins that no
// affiliate brought in), at example commission rates, to show partners what
// they would see. Read-only: nothing is written and no lead details leave here.
export const DEMO_RATE: AffiliateRate = { monthly: 125, yearly: 150, builderYearly: 350 };

export async function mainLinkDemoDashboard(rate: AffiliateRate, fromIso: string | null, toIso: string | null) {
  const commissionOf = (plan: ClosePlan | null) =>
    plan === "monthly" ? rate.monthly : plan === "yearly" ? rate.yearly : plan === "builder_yearly" ? rate.builderYearly : 0;
  const closesIn = (from: string | null, to: string | null) =>
    query<{ close_plan: ClosePlan | null; closed_at: string | Date }>(
      `SELECT close_plan, closed_at FROM crm_leads
       WHERE source = 'free_course_application' AND affiliate_id IS NULL AND status = 'closed'
         AND ($1::timestamptz IS NULL OR closed_at >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR closed_at < $2::timestamptz)
       ORDER BY closed_at DESC NULLS LAST`,
      [from, to]
    );
  const [visitors, optIns, closes, allCloses] = await Promise.all([
    query<{ n: number }>(
      `SELECT count(DISTINCT visitor_id)::int AS n FROM site_events
       WHERE funnel = 'organic' AND step = 'view'
         AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)`,
      [fromIso, toIso]
    ),
    query<{ n: number }>(
      `SELECT count(*)::int AS n FROM crm_leads
       WHERE source = 'free_course_application' AND affiliate_id IS NULL
         AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)`,
      [fromIso, toIso]
    ),
    closesIn(fromIso, toIso),
    closesIn(null, null),
  ]);
  const rows: CloseRow[] = closes.map((c) => ({
    lead_id: "",
    lead_name: "",
    close_plan: c.close_plan,
    closed_at: c.closed_at,
    commission: commissionOf(c.close_plan),
  }));
  const earnedAll = allCloses.reduce((s, c) => s + commissionOf(c.close_plan), 0);
  return {
    link: SITE_URL,
    rate,
    numbers: summarize(visitors[0]?.n ?? 0, optIns[0]?.n ?? 0, rows),
    totals: { earned: earnedAll, paid: 0, owed: earnedAll } as AffiliateTotals,
    recent: rows.slice(0, 25).map((c) => ({
      closedAt: iso(c.closed_at),
      plan: CLOSE_PLANS.find((p) => p.id === c.close_plan)?.label ?? "Closed",
      commission: c.commission,
    })),
  };
}
