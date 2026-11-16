import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerEvents } from "@/lib/crm/partners";
import EarningsChart from "./EarningsChart";
import OverviewTabs from "./OverviewTabs";
import Shell from "./Shell";
import { buildDashboard, RANGES, type RangeId } from "./stats";

export const dynamic = "force-dynamic";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Change({ value, points }: { value: number | null; points?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const text = points ? `${up ? "+" : ""}${(value * 100).toFixed(1)}` : `${up ? "+" : ""}${(value * 100).toFixed(1)}%`;
  return <span className={`ml-1.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>{text}</span>;
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const { range: r } = await searchParams;
  const range: RangeId = RANGES.some((x) => x.id === r) ? (r as RangeId) : "mtd";
  const d = buildDashboard(await partnerEvents(partner.id), range);
  const first = partner.name.split(/\s+/)[0];

  const stats = [
    { label: "Signups", value: String(d.signups), change: <Change value={d.changes.signups} /> },
    { label: "Purchases", value: String(d.purchases), change: <Change value={d.changes.purchases} /> },
    { label: "Conversion", value: pct(d.conversion), change: <Change value={d.changes.conversion} points /> },
    { label: "Reversals", value: String(d.reversals), change: null },
    { label: "Monthly", value: money(d.monthly), change: null },
    { label: "Yearly", value: money(d.yearly), change: null },
  ];

  return (
    <Shell partner={partner} active="/partner">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{greeting()}, {first} 👋</h1>
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold">Base44</span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-lg">📈</span>
        <div>
          <p className="text-sm font-semibold">
            {d.salesThisMonth === 0 ? "No sales yet this month" : `${d.salesThisMonth} ${d.salesThisMonth === 1 ? "sale" : "sales"} this month`}
          </p>
          <p className="text-xs text-slate-600">Sales show up here 2 to 3 hours after they happen.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Total earnings</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {money(d.earnings)}
            <Change value={d.changes.earnings} />
          </p>
          {d.prevEarnings !== null ? <p className="mt-1 text-sm text-slate-500">vs {money(d.prevEarnings)} previous period</p> : null}
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {RANGES.map((x) => (
            <Link
              key={x.id}
              href={`/partner?range=${x.id}`}
              className={`rounded-md px-3 py-1 text-sm ${x.id === range ? "bg-white font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      <EarningsChart series={d.series} />

      <div className="mt-6 grid grid-cols-2 gap-y-5 border-y border-slate-200 py-5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div key={s.label} className={`px-4 ${i % 6 ? "lg:border-l lg:border-slate-200" : ""}`}>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-lg font-semibold">
              {s.value}
              {s.change}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm text-slate-500">Yearly plan ratio</p>
        <p className="mt-1">
          <span className="text-lg font-semibold text-indigo-600">{pct(d.yearlyRatio)}</span>
          <span className="ml-2 text-sm text-slate-500">{d.yearlySales} of {d.purchases} sales on a yearly plan</span>
        </p>
      </div>

      <h2 className="mt-10 text-2xl font-semibold">Overview</h2>
      <OverviewTabs plans={d.plans} countries={d.countries} />
    </Shell>
  );
}
