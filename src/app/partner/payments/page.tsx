import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerPayouts, partnerTotals } from "@/lib/crm/partners";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500";

export default async function PartnerPaymentsPage() {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const [totals, payouts] = await Promise.all([partnerTotals(partner.id), partnerPayouts(partner.id)]);

  return (
    <Shell partner={partner} active="/partner/payments">
      <h1 className="text-xl font-semibold">Payments</h1>

      <div className="mt-6 border-b border-slate-200 pb-6">
        <p className="text-sm text-slate-500">Balance owed to you</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{money(Math.max(0, totals.owed))}</p>
        <div className="mt-6 grid grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Total earned</p>
            <p className="mt-1 text-lg font-semibold">{money(totals.earned)}</p>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <p className="text-sm text-slate-500">Total paid</p>
            <p className="mt-1 text-lg font-semibold">{money(totals.paid)}</p>
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Payout history</h2>
      {payouts.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No payouts yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Payment date</th>
                <th className={th}>Note</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {payouts.map((p, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">{date(p.at)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.note || "–"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(p.amount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">Paid</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
