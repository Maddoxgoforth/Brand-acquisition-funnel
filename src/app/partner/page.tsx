import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerEvents } from "@/lib/crm/partners";
import EarningsChart from "./EarningsChart";
import OverviewTabs from "./OverviewTabs";
import Shell from "./Shell";
import { buildDashboard, RANGES, type RangeId } from "./stats";
import { Change, money, Segmented, StatRow } from "./ui";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const { range: r } = await searchParams;
  const range: RangeId = RANGES.some((x) => x.id === r) ? (r as RangeId) : "1d";
  const d = buildDashboard(await partnerEvents(partner.id), range);
  const first = partner.name.split(/\s+/)[0];

  return (
    <Shell partner={partner} active="/partner">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-950">
          {greeting()}, {first} 👋
        </h1>
        <Segmented items={[{ label: "Base44", active: true }]} />
      </div>

      <div className="mt-4 flex items-center gap-3.5 rounded-lg bg-[linear-gradient(to_left,#fff7de,#ffe89a)] px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-base">📈</span>
        <div className="leading-snug">
          <p className="text-sm font-semibold text-slate-950">
            {d.salesThisMonth === 0
              ? "No sales yet this month"
              : `You have ${d.salesThisMonth} ${d.salesThisMonth === 1 ? "sale" : "sales"} this month`}
          </p>
          <p className="text-[13px] text-slate-700">Sales show up here 2 to 3 hours after they happen.</p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-slate-950">Total earnings</p>
          <p className="mt-1.5 flex items-center text-[28px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
            {money(d.earnings)}
            <Change value={d.changes.earnings} empty />
          </p>
          {d.prevEarnings !== null ? (
            <p className="mt-2.5 text-sm text-slate-600">vs {money(d.prevEarnings)} previous period</p>
          ) : null}
        </div>
        <Segmented items={RANGES.map((x) => ({ label: x.label, href: `/partner?range=${x.id}`, active: x.id === range }))} />
      </div>

      <EarningsChart series={d.series} />

      <div className="mt-6">
        <StatRow
          stats={[
            { label: "Signups", value: <>{d.signups}<Change value={d.changes.signups} /></> },
            { label: "Purchases", value: <>{d.purchases}<Change value={d.changes.purchases} /></> },
            { label: "Conversion", value: <>{pct(d.conversion)}<Change value={d.changes.conversion} points /></> },
            { label: "Reversals", value: d.reversals },
            { label: "Monthly", value: money(d.monthly) },
            { label: "Yearly", value: money(d.yearly) },
          ]}
        />
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-sm font-medium text-slate-600">Yearly plan ratio</p>
        <p className="mt-1.5">
          <span className="text-xl font-semibold text-indigo-600 tabular-nums">{pct(d.yearlyRatio)}</span>
          <span className="ml-2 text-sm text-slate-600">
            {d.yearlySales} of {d.purchases} sales on a yearly plan
          </span>
        </p>
      </div>

      <h2 className="mt-10 text-[22px] font-semibold text-slate-950">Overview</h2>
      <OverviewTabs plans={d.plans} countries={d.countries} />
    </Shell>
  );
}
