import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerEvents, partnerLinks } from "@/lib/crm/partners";
import CopyButton from "../CopyButton";
import Shell from "../Shell";
import { buildDashboard } from "../stats";

export const dynamic = "force-dynamic";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default async function PartnerLinksPage() {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const d = buildDashboard(await partnerEvents(partner.id), "mtd");
  const r = partner.rates;
  const rates: [string, number][] = (
    [
      ["Builder monthly", r.builder_monthly],
      ["Builder yearly", r.builder_yearly],
      ["Starter yearly", r.starter_yearly],
      ["Starter monthly", r.starter_monthly],
    ] as [string, number][]
  ).filter(([, v]) => v > 0);

  return (
    <Shell partner={partner} active="/partner/links">
      <h1 className="text-xl font-semibold">Your links</h1>

      <div className="mt-6 border-b border-slate-200 pb-6">
        <p className="text-sm text-slate-500">Total earnings this month</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{money(d.earnings)}</p>
        {d.prevEarnings !== null ? <p className="mt-1 text-sm text-slate-500">vs {money(d.prevEarnings)} same period last month</p> : null}
        <div className="mt-6 grid grid-cols-3">
          {[
            ["Signups", String(d.signups)],
            ["Purchases", String(d.purchases)],
            ["Conversion", `${(d.conversion * 100).toFixed(1)}%`],
          ].map(([k, v], i) => (
            <div key={k} className={i ? "border-l border-slate-200 pl-4" : ""}>
              <p className="text-sm text-slate-500">{k}</p>
              <p className="mt-1 text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-indigo-600">Base44</p>
      {rates.length ? (
        <p className="mt-1 text-sm text-slate-600">
          Commission per sale: <span className="font-medium text-slate-900">{rates.map(([k, v]) => `${k} ${money(v)}`).join(" · ")}</span>
        </p>
      ) : null}

      {partner.subid ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sub-ID: {partner.subid}</p>
          <div className="mt-2 divide-y divide-slate-200">
            {partnerLinks(partner.subid).map((l) => (
              <div key={l.url} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="truncate text-xs text-slate-500">{l.url}</p>
                </div>
                <CopyButton text={l.url} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Your links are being set up. Check back soon.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">Use these exact links. Sales only count for you when they come through a link with your sub-ID.</p>
    </Shell>
  );
}
