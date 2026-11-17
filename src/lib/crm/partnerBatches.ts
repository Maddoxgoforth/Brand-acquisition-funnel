import { query } from "./db";

// Partner payouts in batches (owner's request, Nov 16 2026).
// - Every sale (and reversal) falls in a PERIOD_DAYS-day period of Eastern-time
//   calendar days, counted from EPOCH (Nov 1 2026 → Nov 1-5, Nov 6-10, ...).
// - HOLD_DAYS after a period ends it becomes "ready"; the owner approves it
//   (amount frozen, partner sees "Pending"), then marks it paid ("Paid").
// - Reversals: if the original sale's period isn't approved yet, the reversal
//   comes out of that period; otherwise out of the period it happened in.
// - Anything that lands in an already approved period (a late event) and any
//   period that nets to $0 or less is carried into the next open period.
export const PERIOD_DAYS = Math.max(1, Number(process.env.PARTNER_PAYOUT_PERIOD_DAYS) || 5);
export const HOLD_DAYS = Math.max(0, Number(process.env.PARTNER_PAYOUT_HOLD_DAYS) || 14);
const EPOCH = Date.UTC(2026, 10, 1); // Nov 1 2026, as a calendar day
const DAY = 86_400_000;

export type BatchStatus = "open" | "holding" | "ready" | "approved" | "paid" | "carried";

export type Batch = {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  sales: number;
  reversals: number;
  amount: number;
  status: BatchStatus;
  readyOn: string; // YYYY-MM-DD the hold ends
  approvedAt: string | null;
  paidAt: string | null;
};

const etDay = (d: Date) => {
  const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d)
    .split("-")
    .map(Number);
  return Date.UTC(y, m - 1, dd);
};
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const periodOf = (dayMs: number) => EPOCH + Math.floor((dayMs - EPOCH) / (PERIOD_DAYS * DAY)) * PERIOD_DAYS * DAY;
const round2 = (n: number) => Math.round(n * 100) / 100;

type EventRow = { kind: string; commission: string; occurred_at: string | Date; order_ref: string };
type StoredRow = { period_start: string; amount: string; sales: number; status: string; approved_at: string | Date; paid_at: string | Date | null };

export async function partnerBatches(partnerId: string, now = new Date()): Promise<Batch[]> {
  const [events, stored] = await Promise.all([
    query<EventRow>(
      `SELECT kind, commission, occurred_at, order_ref FROM crm_partner_events
       WHERE partner_id = $1 AND kind IN ('purchase', 'reversal') ORDER BY occurred_at`,
      [partnerId]
    ),
    query<StoredRow>(`SELECT period_start::text AS period_start, amount, sales, status, approved_at, paid_at FROM crm_partner_payout_batches WHERE partner_id = $1`, [partnerId]),
  ]);
  const locked = new Map(stored.map((r) => [Date.parse(`${r.period_start.slice(0, 10)}T00:00:00Z`), r]));
  const today = etDay(now);
  const raw = new Map<number, { amount: number; sales: number; reversals: number }>();
  const purchasePeriod = new Map<string, number>();
  const bucket = (p: number) => {
    if (!raw.has(p)) raw.set(p, { amount: 0, sales: 0, reversals: 0 });
    return raw.get(p)!;
  };
  for (const e of events) {
    let p = periodOf(etDay(new Date(e.occurred_at)));
    if (e.kind === "purchase" && e.order_ref) purchasePeriod.set(e.order_ref, p);
    if (e.kind === "reversal" && e.order_ref && purchasePeriod.has(e.order_ref)) {
      const orig = purchasePeriod.get(e.order_ref)!;
      if (!locked.has(orig)) p = orig;
    }
    const b = bucket(p);
    b.amount += Number(e.commission);
    if (e.kind === "purchase") b.sales++;
    else b.reversals++;
  }
  for (const p of locked.keys()) bucket(p);
  const periods = [...raw.keys()].sort((a, b) => a - b);
  const out: Batch[] = [];
  let carry = 0;
  for (const p of periods) {
    const r = raw.get(p)!;
    const end = p + (PERIOD_DAYS - 1) * DAY;
    const readyOn = end + (HOLD_DAYS + 1) * DAY;
    const base = { periodStart: ymd(p), periodEnd: ymd(end), sales: r.sales, reversals: r.reversals, readyOn: ymd(readyOn) };
    const lock = locked.get(p);
    if (lock) {
      // Frozen at approval; anything that arrived for this period since moves on.
      carry += r.amount - Number(lock.amount);
      out.push({
        ...base,
        sales: lock.sales,
        amount: Number(lock.amount),
        status: lock.status === "paid" ? "paid" : "approved",
        approvedAt: new Date(lock.approved_at).toISOString(),
        paidAt: lock.paid_at ? new Date(lock.paid_at).toISOString() : null,
      });
      continue;
    }
    const amount = round2(r.amount + carry);
    carry = 0;
    const status: BatchStatus = today <= end ? "open" : today < readyOn ? "holding" : "ready";
    if (amount <= 0 && status !== "open") {
      carry = amount;
      out.push({ ...base, amount, status: "carried", approvedAt: null, paidAt: null });
      continue;
    }
    out.push({ ...base, amount, status, approvedAt: null, paidAt: null });
  }
  if (carry !== 0) {
    // A late reversal/event after the last open period: show it as the
    // current period so it's not lost.
    const p = periodOf(today);
    const last = out[out.length - 1];
    if (last && last.periodStart === ymd(p) && (last.status === "open" || last.status === "holding" || last.status === "ready")) {
      last.amount = round2(last.amount + carry);
    } else {
      const end = p + (PERIOD_DAYS - 1) * DAY;
      out.push({ periodStart: ymd(p), periodEnd: ymd(end), sales: 0, reversals: 0, amount: round2(carry), status: "open", readyOn: ymd(end + (HOLD_DAYS + 1) * DAY), approvedAt: null, paidAt: null });
    }
  }
  return out.reverse(); // newest first
}

export function batchTotals(batches: Batch[]) {
  const sum = (s: BatchStatus[]) => round2(batches.filter((b) => s.includes(b.status)).reduce((t, b) => t + b.amount, 0));
  return { paid: sum(["paid"]), pending: sum(["approved"]), ready: sum(["ready"]), upcoming: sum(["open", "holding"]) };
}

export async function approveBatch(partnerId: string, periodStart: string) {
  const b = (await partnerBatches(partnerId)).find((x) => x.periodStart === periodStart);
  if (!b || b.status !== "ready" || b.amount <= 0) return false;
  await query(
    `INSERT INTO crm_partner_payout_batches (partner_id, period_start, period_end, amount, sales, status)
     VALUES ($1, $2, $3, $4, $5, 'approved') ON CONFLICT DO NOTHING`,
    [partnerId, b.periodStart, b.periodEnd, b.amount, b.sales]
  );
  return true;
}

export async function markBatchPaid(partnerId: string, periodStart: string, paid: boolean) {
  const rows = await query(
    paid
      ? `UPDATE crm_partner_payout_batches SET status = 'paid', paid_at = now() WHERE partner_id = $1 AND period_start = $2 AND status = 'approved' RETURNING 1`
      : `UPDATE crm_partner_payout_batches SET status = 'approved', paid_at = NULL WHERE partner_id = $1 AND period_start = $2 AND status = 'paid' RETURNING 1`,
    [partnerId, periodStart]
  );
  return rows.length > 0;
}

// Undo an approval that hasn't been paid (the period goes back to "ready").
export async function unapproveBatch(partnerId: string, periodStart: string) {
  const rows = await query(
    `DELETE FROM crm_partner_payout_batches WHERE partner_id = $1 AND period_start = $2 AND status = 'approved' RETURNING 1`,
    [partnerId, periodStart]
  );
  return rows.length > 0;
}
