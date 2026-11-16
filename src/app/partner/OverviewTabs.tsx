"use client";

import { useState } from "react";

type Plan = { plan: string; billing: string; sales: number; earned: number };
type Country = { country: string; sales: number; earned: number };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500";
const td = "px-4 py-3 text-sm";

export default function OverviewTabs({ plans, countries }: { plans: Plan[]; countries: Country[] }) {
  const [tab, setTab] = useState<"plans" | "countries">("plans");
  const total = plans.reduce((s, p) => s + p.earned, 0);
  const totalC = countries.reduce((s, c) => s + c.earned, 0);
  const share = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1)}%` : "0.0%");

  return (
    <div className="mt-3">
      <div className="flex gap-5 border-b border-slate-200 text-sm">
        {(["plans", "countries"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2 capitalize ${tab === t ? "border-indigo-600 font-semibold text-indigo-600" : "border-transparent text-slate-600"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {(tab === "plans" ? plans.length : countries.length) === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No sales in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              {tab === "plans" ? (
                <tr><th className={th}>Plan</th><th className={th}>Billing period</th><th className={`${th} text-right`}>Sales</th><th className={`${th} text-right`}>Your earnings</th><th className={`${th} text-right`}>% of total</th></tr>
              ) : (
                <tr><th className={th}>Country</th><th className={`${th} text-right`}>Sales</th><th className={`${th} text-right`}>Your earnings</th><th className={`${th} text-right`}>% of total</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tab === "plans"
                ? plans.map((p) => (
                    <tr key={p.plan + p.billing}>
                      <td className={td}>{p.plan}</td>
                      <td className={td}>{p.billing}</td>
                      <td className={`${td} text-right tabular-nums`}>{p.sales}</td>
                      <td className={`${td} text-right tabular-nums text-emerald-600`}>{money(p.earned)}</td>
                      <td className={`${td} text-right tabular-nums`}>{share(p.earned, total)}</td>
                    </tr>
                  ))
                : countries.map((c) => (
                    <tr key={c.country}>
                      <td className={td}>{c.country}</td>
                      <td className={`${td} text-right tabular-nums`}>{c.sales}</td>
                      <td className={`${td} text-right tabular-nums text-emerald-600`}>{money(c.earned)}</td>
                      <td className={`${td} text-right tabular-nums`}>{share(c.earned, totalC)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
