import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerEvents, partnerLinksFor } from "@/lib/crm/partners";
import CopyButton from "../CopyButton";
import Shell from "../Shell";
import { buildDashboard } from "../stats";
import { Change, money, Segmented, StatRow } from "../ui";

export const dynamic = "force-dynamic";

export default async function PartnerLinksPage() {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const d = buildDashboard(await partnerEvents(partner.id), "mtd");
  const r = partner.rates;
  const rates: [string, number][] = (
    [
      ["Monthly", r.builder_monthly],
      ["Yearly", r.starter_yearly],
      ["Builder yearly", r.builder_yearly],
      ["Starter monthly", r.starter_monthly],
    ] as [string, number][]
  ).filter(([, v]) => v > 0);

  return (
    <Shell partner={partner} active="/partner/links">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-950">Your links</h1>
        <Segmented items={[{ label: "Base44", active: true }]} />
      </div>

      <div className="mt-6">
        <p className="text-[15px] text-slate-950">Total earnings this month</p>
        <p className="mt-1.5 flex items-center text-[28px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
          {money(d.earnings)}
          <Change value={d.changes.earnings} empty />
        </p>
        {d.prevEarnings !== null ? <p className="mt-2.5 text-sm text-slate-600">vs {money(d.prevEarnings)} same period last month</p> : null}
      </div>

      <div className="mt-6 border-b border-slate-200/80 pb-6">
        <StatRow
          stats={[
            { label: "Signups", value: <>{d.signups}<Change value={d.changes.signups} /></> },
            { label: "Purchases", value: <>{d.purchases}<Change value={d.changes.purchases} /></> },
            { label: "Conversion", value: <>{`${(d.conversion * 100).toFixed(1)}%`}<Change value={d.changes.conversion} points /></> },
          ]}
        />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-indigo-600">Base44</p>
      {rates.length ? (
        <p className="mt-1 text-sm text-slate-600">
          Commission per sale: <span className="font-semibold text-slate-950">{rates.map(([k, v]) => `${k} ${money(v)}`).join(" · ")}</span>
        </p>
      ) : null}

      {partnerLinksFor(partner).length ? (
        <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Your ID: {partner.linkSubid || partner.subid}</p>
          <div className="mt-2 space-y-1">
            {partnerLinksFor(partner).map((l) => (
              <div key={l.url} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{l.label}</p>
                  <p className="truncate text-[13px] text-indigo-600">{l.url}</p>
                </div>
                <CopyButton text={l.url} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm text-slate-600">Your links are being set up. Check back soon.</p>
      )}
      <p className="mt-3 text-[13px] text-slate-600">Use these exact links. Sales only count for you when they come through one of your links.</p>
    </Shell>
  );
}
