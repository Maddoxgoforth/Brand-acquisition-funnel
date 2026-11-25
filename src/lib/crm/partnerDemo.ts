import "server-only";

import { query } from "./db";

// Owner's affiliate-portal demo (Nov 21 2026). Visiting /partner/demo while
// signed in to the CRM as owner opens the whole Mad Media affiliate portal as a
// pretend affiliate ("Maddox Goforth") filled with the owner's OWN sales, at
// example rates, so he can show partners what they would see:
//   - AffiliateConsulting webhook events no affiliate brought in (Nov 16 on),
//   - plus every CRM close from before the first webhook sale, shown as if it
//     had come through the webhook.
// Numbers are doubled (owner, Nov 25 2026; see demoEventRows).
// Nothing is written: no fake rows in crm_partner_events or payout tables, so
// real stats, reports and real affiliates' money are untouched. Payout periods
// past their hold show as paid out, as the owner asked.
export const DEMO_ID = "00000000-0000-4000-8000-00000000d3e0";
export const isDemoId = (id: string) => id === DEMO_ID;

export const DEMO_RATES = { builder_monthly: 125, builder_yearly: 350, starter_monthly: 0, starter_yearly: 150 } as const;
type DemoPlan = keyof typeof DEMO_RATES;

// CRM close plan ids → AffiliateConsulting plan keys.
const FROM_CLOSE: Record<string, DemoPlan> = { monthly: "builder_monthly", yearly: "starter_yearly", builder_yearly: "builder_yearly" };

export type DemoEventRow = { kind: string; plan_key: string; country: string; commission: number; occurred_at: Date; order_ref: string };

export async function demoEventRows(): Promise<DemoEventRow[]> {
  const [webhook, closes] = await Promise.all([
    query<{ kind: string; plan_key: string; country: string; occurred_at: string | Date; order_ref: string }>(
      `SELECT kind, plan_key, country, occurred_at, order_ref FROM crm_partner_events
       WHERE partner_id IS NULL AND (kind = 'signup' OR plan_key <> '') ORDER BY occurred_at`
    ),
    query<{ id: string; close_plan: string; closed_at: string | Date }>(
      `SELECT id, close_plan, closed_at FROM crm_leads
       WHERE status = 'closed' AND closed_at IS NOT NULL AND close_plan IS NOT NULL ORDER BY closed_at`
    ),
  ]);
  const rate = (plan: string) => DEMO_RATES[plan as DemoPlan] ?? 0;
  const out: DemoEventRow[] = webhook.map((e) => ({
    kind: e.kind,
    plan_key: e.plan_key,
    country: e.country,
    commission: e.kind === "purchase" ? rate(e.plan_key) : e.kind === "reversal" ? -rate(e.plan_key) : 0,
    occurred_at: new Date(e.occurred_at),
    order_ref: e.order_ref,
  }));
  // Webhook sales only exist from the first one on; earlier sales come from
  // the CRM (a sign-up a few minutes before each sale, like the real flow).
  const firstSale = webhook.find((e) => e.kind === "purchase");
  const cutoff = firstSale ? new Date(firstSale.occurred_at).getTime() : Infinity;
  for (const c of closes) {
    const at = new Date(c.closed_at);
    const plan = FROM_CLOSE[c.close_plan];
    if (!plan || at.getTime() >= cutoff) continue;
    out.push({ kind: "signup", plan_key: "", country: "US", commission: 0, occurred_at: new Date(at.getTime() - 20 * 60_000), order_ref: "" });
    out.push({ kind: "purchase", plan_key: plan, country: "US", commission: rate(plan), occurred_at: at, order_ref: `crm-${c.id}` });
  }
  // Owner, Nov 25 2026: the demo shows double his numbers. Every event is
  // shown twice; the copy sits 2–5 hours earlier (fixed per event, so it
  // doesn't move between reloads) under its own order ref. A purchase and its
  // reversal share the order ref, so they move by the same amount and still
  // match. Display only: nothing is stored.
  const shift = (key: string) => {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return (120 + (h % 181)) * 60_000; // 2h to 5h
  };
  const doubled = out.flatMap((e) => [
    e,
    {
      ...e,
      occurred_at: new Date(e.occurred_at.getTime() - shift(e.order_ref || `${e.kind}:${e.occurred_at.getTime()}`)),
      order_ref: e.order_ref ? `${e.order_ref}-x2` : "",
    },
  ]);
  return doubled.sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());
}

export const DEMO_PAYOUT_METHOD = {
  holderName: "Maddox Goforth",
  bankName: "Chase",
  accountType: "checking" as const,
  routingLast4: "1813",
  accountLast4: "4827",
  updatedAt: new Date(Date.UTC(2026, 10, 1)).toISOString(),
};
