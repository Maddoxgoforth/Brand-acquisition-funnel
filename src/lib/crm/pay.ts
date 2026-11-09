import "server-only";

import {
  isPayPlan,
  payPlanNoun,
  type ActivityItem,
  type BonusRule,
  type Bounty,
  type BountyMode,
  type CommissionRate,
  type PayLine,
  type PayMemberRow,
  type PayPlan,
  type PayReport,
  type SourceId,
} from "./constants";
import { query } from "./db";

// Commissions are worked out from the closes themselves every time, never
// stored: a close that is moved back out of Closed (refund, mistake) drops
// its commission, bounty spot and bonus on its own. Only closes made by team
// members count; the owner's own closes never earn commission or fill a
// bounty.
//
// - Rates: crm_commission_rates keeps each member's rate history, so a new
//   rate only changes closes from then on (unless the owner ticks "apply to
//   past closes too").
// - Bounties: the first `target` matching closes after the bounty starts
//   (and before its deadline / early end) take its spots, oldest bounty
//   first. A close fills at most one bounty.
// - Bonus rules: every Nth matching close a member makes while the rule is
//   on pays the rule's amount.
// - Manual lines (crm_pay_entries): adjustments (+/-) and payouts sent.

const NOT_TEAM = ["owner", "website", "webhook", "manual"];

type Close = {
  id: string;
  name: string;
  plan: "monthly" | "yearly" | null;
  at: Date;
  userId: string;
  userName: string;
};

type RateRow = { user_id: string; monthly: number; yearly: number; effective_from: string | Date | null; id: string | number };

type BountyRow = {
  id: string;
  title: string;
  description: string;
  plan: string;
  target: number;
  amount: number;
  mode: string;
  starts_at: string | Date;
  ends_at: string | Date | null;
  ended_at: string | Date | null;
  created_at: string | Date;
};

type RuleRow = {
  id: string;
  name: string;
  plan: string;
  every_n: number;
  amount: number;
  starts_at: string | Date;
  ended_at: string | Date | null;
};

const iso = (v: string | Date) => new Date(v).toISOString();
const isoOrNull = (v: string | Date | null) => (v ? iso(v) : null);
const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const matches = (plan: PayPlan, closePlan: Close["plan"]) => plan === "any" || plan === closePlan;

async function loadCloses(): Promise<Close[]> {
  const rows = await query<{
    id: string;
    name: string;
    close_plan: string | null;
    closed_at: string | Date;
    closed_by_id: string;
    closed_by_name: string | null;
  }>(
    `SELECT id, name, close_plan, closed_at, closed_by_id, closed_by_name FROM crm_leads
     WHERE status = 'closed' AND closed_at IS NOT NULL AND closed_by_id IS NOT NULL
       AND closed_by_id <> ALL($1::text[])
     ORDER BY closed_at, id`,
    [NOT_TEAM]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name || "No name",
    plan: r.close_plan === "monthly" || r.close_plan === "yearly" ? r.close_plan : null,
    at: new Date(r.closed_at),
    userId: r.closed_by_id,
    userName: r.closed_by_name || "Unknown",
  }));
}

function toBounty(r: BountyRow, claims: Bounty["claims"]): Bounty {
  const now = Date.now();
  const over =
    (r.ended_at && new Date(r.ended_at).getTime() <= now) ||
    (r.ends_at && new Date(r.ends_at).getTime() <= now);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    plan: isPayPlan(r.plan) ? r.plan : "any",
    target: r.target,
    amount: r.amount,
    mode: r.mode === "extra" ? "extra" : "replace",
    startsAt: iso(r.starts_at),
    endsAt: isoOrNull(r.ends_at),
    endedAt: isoOrNull(r.ended_at),
    createdAt: iso(r.created_at),
    state: claims.length >= r.target ? "done" : over ? "ended" : "live",
    claims,
  };
}

// Which bounty (if any) each close filled.
function assignBounties(closes: Close[], bounties: BountyRow[]) {
  const ordered = [...bounties].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const filled = new Map<string, Close[]>(ordered.map((b) => [b.id, []]));
  const byClose = new Map<string, BountyRow>();
  for (const c of closes) {
    const t = c.at.getTime();
    const b = ordered.find((b) => {
      const end = Math.min(
        b.ends_at ? new Date(b.ends_at).getTime() : Infinity,
        b.ended_at ? new Date(b.ended_at).getTime() : Infinity
      );
      return (
        matches(isPayPlan(b.plan) ? b.plan : "any", c.plan) &&
        t >= new Date(b.starts_at).getTime() &&
        t < end &&
        filled.get(b.id)!.length < b.target
      );
    });
    if (b) {
      filled.get(b.id)!.push(c);
      byClose.set(c.id, b);
    }
  }
  return { filled, byClose };
}

export async function listBounties(): Promise<Bounty[]> {
  const [closes, rows] = await Promise.all([
    loadCloses(),
    query<BountyRow>(`SELECT * FROM crm_bounties ORDER BY created_at DESC`),
  ]);
  const { filled } = assignBounties(closes, rows);
  return rows.map((r) =>
    toBounty(
      r,
      filled.get(r.id)!.map((c) => ({ name: c.userName, closedAt: c.at.toISOString() }))
    )
  );
}

export type BountyInput = {
  title: string;
  description: string;
  plan: PayPlan;
  target: number;
  amount: number;
  mode: BountyMode;
  endsAt: string | null;
};

export async function createBounty(b: BountyInput) {
  await query(
    `INSERT INTO crm_bounties (title, description, plan, target, amount, mode, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [b.title, b.description, b.plan, b.target, b.amount, b.mode, b.endsAt]
  );
}

// Ends a bounty early (closes after this don't count) or reopens it.
export async function setBountyEnded(id: string, ended: boolean) {
  const rows = await query(
    `UPDATE crm_bounties SET ended_at = CASE WHEN $2 THEN now() ELSE NULL END
     WHERE id = $1 RETURNING id`,
    [id, ended]
  );
  return rows.length > 0;
}

export async function deleteBounty(id: string) {
  const rows = await query(`DELETE FROM crm_bounties WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

// ---- Rates -----------------------------------------------------------------

function rateAt(rows: RateRow[], userId: string, at: Date): CommissionRate {
  let best: RateRow | null = null;
  let bestFrom = -Infinity;
  for (const r of rows) {
    if (r.user_id !== userId) continue;
    const from = r.effective_from ? new Date(r.effective_from).getTime() : -Infinity;
    if (from > at.getTime()) continue;
    if (!best || from > bestFrom || (from === bestFrom && Number(r.id) > Number(best.id))) {
      best = r;
      bestFrom = from;
    }
  }
  return best ? { monthly: best.monthly, yearly: best.yearly } : { monthly: 0, yearly: 0 };
}

export async function setRate(userId: string, rate: CommissionRate, applyToPast: boolean) {
  const existing = await query(`SELECT id FROM crm_commission_rates WHERE user_id = $1 LIMIT 1`, [userId]);
  if (applyToPast || existing.length === 0) {
    // The first rate (or "apply to past closes too") covers every close.
    await query(`DELETE FROM crm_commission_rates WHERE user_id = $1`, [userId]);
    await query(
      `INSERT INTO crm_commission_rates (user_id, monthly, yearly, effective_from) VALUES ($1, $2, $3, NULL)`,
      [userId, rate.monthly, rate.yearly]
    );
  } else {
    await query(
      `INSERT INTO crm_commission_rates (user_id, monthly, yearly, effective_from) VALUES ($1, $2, $3, now())`,
      [userId, rate.monthly, rate.yearly]
    );
  }
}

// ---- Bonus rules and manual lines -----------------------------------------

export async function createRule(r: { name: string; plan: PayPlan; everyN: number; amount: number }) {
  await query(
    `INSERT INTO crm_bonus_rules (name, plan, every_n, amount) VALUES ($1, $2, $3, $4)`,
    [r.name, r.plan, r.everyN, r.amount]
  );
}

export async function setRuleEnded(id: string, ended: boolean) {
  const rows = await query(
    `UPDATE crm_bonus_rules SET ended_at = CASE WHEN $2 THEN now() ELSE NULL END
     WHERE id = $1 RETURNING id`,
    [id, ended]
  );
  return rows.length > 0;
}

export async function deleteRule(id: string) {
  const rows = await query(`DELETE FROM crm_bonus_rules WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function addPayEntry(e: {
  userId: string;
  kind: "adjustment" | "payout";
  amount: number;
  note: string;
  at: string | null;
}) {
  await query(
    `INSERT INTO crm_pay_entries (user_id, kind, amount, note, at) VALUES ($1, $2, $3, $4, coalesce($5::timestamptz, now()))`,
    [e.userId, e.kind, e.amount, e.note, e.at]
  );
}

export async function deletePayEntry(id: string) {
  const rows = await query(`DELETE FROM crm_pay_entries WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

// ---- The ledger ------------------------------------------------------------

async function buildLedger() {
  const [closes, rates, bounties, rules, entries] = await Promise.all([
    loadCloses(),
    query<RateRow>(`SELECT * FROM crm_commission_rates`),
    query<BountyRow>(`SELECT * FROM crm_bounties`),
    query<RuleRow>(`SELECT * FROM crm_bonus_rules ORDER BY created_at`),
    query<{ id: string; user_id: string; kind: string; amount: number; note: string; at: string | Date }>(
      `SELECT * FROM crm_pay_entries`
    ),
  ]);
  const { byClose } = assignBounties(closes, bounties);
  const lines: PayLine[] = [];

  for (const c of closes) {
    const rate = rateAt(rates, c.userId, c.at);
    const base = c.plan ? rate[c.plan] : 0;
    const bounty = byClose.get(c.id);
    const what = c.plan ? `${c.plan} close` : "close (no plan recorded)";
    const at = c.at.toISOString();
    if (!bounty || bounty.mode === "extra") {
      lines.push({ kind: "close", userId: c.userId, amount: base, at, label: `${c.name}: ${what}`, leadId: c.id, entryId: null });
    }
    if (bounty) {
      lines.push({
        kind: "bounty",
        userId: c.userId,
        amount: bounty.amount,
        at,
        label:
          bounty.mode === "extra"
            ? `${c.name}: bounty "${bounty.title}" (+${money(bounty.amount)} on top)`
            : `${c.name}: ${what} on bounty "${bounty.title}" (instead of ${money(base)})`,
        leadId: c.id,
        entryId: null,
      });
    }
  }

  for (const rule of rules) {
    const plan = isPayPlan(rule.plan) ? rule.plan : "any";
    const from = new Date(rule.starts_at).getTime();
    const to = rule.ended_at ? new Date(rule.ended_at).getTime() : Infinity;
    const counts = new Map<string, number>();
    for (const c of closes) {
      const t = c.at.getTime();
      if (t < from || t >= to || !matches(plan, c.plan)) continue;
      const n = (counts.get(c.userId) ?? 0) + 1;
      counts.set(c.userId, n);
      if (n % rule.every_n === 0) {
        lines.push({
          kind: "bonus",
          userId: c.userId,
          amount: rule.amount,
          at: c.at.toISOString(),
          label: `${rule.name}: ${n} ${payPlanNoun(plan)}s (with ${c.name})`,
          leadId: c.id,
          entryId: null,
        });
      }
    }
  }

  for (const e of entries) {
    lines.push({
      kind: e.kind === "payout" ? "payout" : "adjustment",
      userId: e.user_id,
      amount: e.amount,
      at: iso(e.at),
      label: e.note || (e.kind === "payout" ? "Payout" : "Adjustment"),
      leadId: null,
      entryId: e.id,
    });
  }
  lines.sort((a, b) => b.at.localeCompare(a.at));
  return { lines, closes, rates, rules };
}

export async function payReport(from: string | null, to: string): Promise<PayReport> {
  const { lines, closes, rates, rules } = await buildLedger();
  const inRange = (at: string) => (from === null || at >= from) && at < to;

  const users = await query<{ id: string; name: string; status: string }>(
    `SELECT id::text AS id, name, status FROM crm_users WHERE status <> 'pending' ORDER BY created_at`
  );
  const activity = await query<{
    actor_id: string;
    dials: number;
    leads_called: number;
    status_changes: number;
    booked: number;
    claimed: number;
  }>(
    `SELECT actor_id,
       count(*) FILTER (WHERE type = 'call')::int AS dials,
       count(DISTINCT lead_id) FILTER (WHERE type = 'call')::int AS leads_called,
       count(*) FILTER (WHERE type = 'status')::int AS status_changes,
       count(DISTINCT lead_id) FILTER (WHERE type = 'status' AND data->>'to' = 'appointment')::int AS booked,
       count(*) FILTER (WHERE type = 'claim' AND data->>'action' <> 'released')::int AS claimed
     FROM crm_events
     WHERE actor_id IS NOT NULL AND ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
       AND created_at < $2::timestamptz
     GROUP BY actor_id`,
    [from, to]
  );
  const last = await query<{ actor_id: string; at: string | Date }>(
    `SELECT actor_id, max(created_at) AS at FROM crm_events WHERE actor_id IS NOT NULL GROUP BY actor_id`
  );

  // Everyone with an account, plus closers whose account was deleted.
  const people = new Map<string, { name: string; status: string }>();
  for (const u of users) people.set(u.id, { name: u.name, status: u.status });
  for (const c of closes) if (!people.has(c.userId)) people.set(c.userId, { name: c.userName, status: "deleted" });

  const now = new Date();
  const members: PayMemberRow[] = [...people.entries()].map(([userId, p]) => {
    const mine = lines.filter((l) => l.userId === userId);
    const ranged = mine.filter((l) => inRange(l.at));
    const sum = (ls: PayLine[], kinds: PayLine["kind"][]) =>
      ls.filter((l) => kinds.includes(l.kind)).reduce((n, l) => n + l.amount, 0);
    const a = activity.find((r) => r.actor_id === userId);
    const myCloses = closes.filter((c) => c.userId === userId && inRange(c.at.toISOString()));
    const earnedAll = sum(mine, ["close", "bounty", "bonus", "adjustment"]);
    const lastAt = last.find((r) => r.actor_id === userId)?.at;
    return {
      userId,
      name: p.name,
      status: p.status,
      rate: rateAt(rates, userId, now),
      dials: a?.dials ?? 0,
      leadsCalled: a?.leads_called ?? 0,
      statusChanges: a?.status_changes ?? 0,
      booked: a?.booked ?? 0,
      claimed: a?.claimed ?? 0,
      lastActiveAt: lastAt ? iso(lastAt) : null,
      monthly: myCloses.filter((c) => c.plan === "monthly").length,
      yearly: myCloses.filter((c) => c.plan === "yearly").length,
      base: sum(ranged, ["close"]),
      bounty: sum(ranged, ["bounty"]),
      bonus: sum(ranged, ["bonus"]),
      adjustments: sum(ranged, ["adjustment"]),
      earned: sum(ranged, ["close", "bounty", "bonus", "adjustment"]),
      paidInRange: sum(ranged, ["payout"]),
      owed: earnedAll - sum(mine, ["payout"]),
    };
  });
  members.sort((a, b) => b.earned - a.earned || a.name.localeCompare(b.name));

  return {
    from,
    to,
    members,
    lines: lines.filter((l) => inRange(l.at)),
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      plan: isPayPlan(r.plan) ? r.plan : "any",
      everyN: r.every_n,
      amount: r.amount,
      startsAt: iso(r.starts_at),
      endedAt: isoOrNull(r.ended_at),
    })) satisfies BonusRule[],
    totals: {
      earned: members.reduce((n, m) => n + m.earned, 0),
      paid: members.reduce((n, m) => n + m.paidInRange, 0),
      owed: members.reduce((n, m) => n + m.owed, 0),
    },
  };
}

// What one person did in a time frame: every call, column move, claim,
// booking and close, newest first.
export async function memberActivity(userId: string, from: string | null, to: string): Promise<ActivityItem[]> {
  const rows = await query<{
    id: number | string;
    type: string;
    data: Record<string, string> | string;
    lead_id: string;
    name: string;
    source: SourceId;
    created_at: string | Date;
  }>(
    `SELECT e.id, e.type, e.data, e.lead_id, l.name, l.source, e.created_at
     FROM crm_events e JOIN crm_leads l ON l.id = e.lead_id
     WHERE e.actor_id = $1 AND ($2::timestamptz IS NULL OR e.created_at >= $2::timestamptz)
       AND e.created_at < $3::timestamptz
     ORDER BY e.created_at DESC, e.id DESC LIMIT 500`,
    [userId, from, to]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    type: r.type,
    data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    leadId: r.lead_id,
    leadName: r.name || "No name",
    source: r.source,
    createdAt: iso(r.created_at),
  }));
}
