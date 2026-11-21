import Link from "next/link";
import { redirect } from "next/navigation";

import { getAffiliateSession } from "@/lib/crm/affiliateAuth";
import { affiliateDashboard } from "@/lib/crm/affiliates";
import { affiliateLogout } from "./actions";
import CopyLink from "./CopyLink";

export const dynamic = "force-dynamic";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

// Start of the time frame (US Eastern days, like the rest of the business).
function rangeStart(range: RangeId): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const offset = now.getTime() - et.getTime();
    et.setHours(0, 0, 0, 0);
    return new Date(et.getTime() + offset).toISOString();
  }
  return new Date(now.getTime() - (range === "7d" ? 7 : 30) * 86400000).toISOString();
}

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number | null) => (n === null ? "–" : `${(n * 100).toFixed(1)}%`);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const affiliate = await getAffiliateSession();
  if (!affiliate) redirect("/affiliates/login");
  const { range: raw } = await searchParams;
  const range: RangeId = RANGES.some((r) => r.id === raw) ? (raw as RangeId) : "30d";
  const data = await affiliateDashboard(affiliate, rangeStart(range), null);
  const n = data.numbers;
  const rateFor = (plan: string) =>
    !data.rate ? 0 : plan === "monthly" ? data.rate.monthly : plan === "yearly" ? data.rate.yearly : data.rate.builderYearly;

  return (
    <main className="min-h-screen bg-background-elevated px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Maddox · Affiliates</p>
            <h1 className="mt-1 text-2xl font-extrabold">Hey {affiliate.name.split(" ")[0]} 👋</h1>
          </div>
          <form action={affiliateLogout}>
            <button type="submit" className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-bold hover:border-accent">
              Sign out
            </button>
          </form>
        </header>

        {data.link ? <CopyLink link={data.link} /> : null}

        <section className="grid grid-cols-3 gap-3">
          <Stat label="Earned" value={money(data.totals.earned)} hint="all time" />
          <Stat label="Paid to you" value={money(data.totals.paid)} hint="all time" />
          <Stat label="Owed" value={money(data.totals.owed)} hint="not paid yet" />
        </section>

        <nav className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={`/affiliates?range=${r.id}`}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                r.id === range ? "bg-accent text-white" : "border border-border bg-background hover:border-accent"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Link visitors" value={n.visitors.toLocaleString()} />
          <Stat
            label="Opt-ins"
            value={n.optIns.toLocaleString()}
            hint={n.visitors > 0 ? `${pct(n.optIns / n.visitors)} of visitors` : undefined}
          />
          <Stat label="Closes" value={n.closes.toLocaleString()} />
          <Stat label="Opt-in → close" value={pct(n.closeRate)} />
          <Stat label="Earned" value={money(n.earned)} hint="in this time frame" />
        </section>

        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="font-extrabold">Sales by plan</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-1">Plan</th>
                <th className="py-1 text-right">Your commission</th>
                <th className="py-1 text-right">Closes</th>
                <th className="py-1 text-right">Earned</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {n.plans.map((p) => (
                <tr key={p.plan} className="border-t border-border">
                  <td className="py-2 font-semibold">{p.label}</td>
                  <td className="py-2 text-right">{money(rateFor(p.plan))} each</td>
                  <td className="py-2 text-right">{p.closes}</td>
                  <td className="py-2 text-right font-bold">{money(p.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="font-extrabold">Latest sales</h2>
          {data.recent.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No sales in this time frame yet. Keep sharing your link!</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {data.recent.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-semibold">{c.plan}</span>
                    <span className="ml-2 text-muted">
                      {c.closedAt
                        ? new Date(c.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
                        : ""}
                    </span>
                  </span>
                  <span className="font-bold text-emerald-700">+{money(c.commission)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-muted">
          Opt-ins count when someone signs up through your link for the first time. Sales count once our team
          closes them. For privacy you only see numbers and plans, not who the people are.
        </p>
      </div>
    </main>
  );
}
