import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerPayouts, partnerTotals } from "@/lib/crm/partners";
import Shell from "../Shell";
import { Segmented, StatRow, tableWrap, td, th } from "../ui";

export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

export default async function PartnerPaymentsPage() {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const [totals, payouts] = await Promise.all([partnerTotals(partner.id), partnerPayouts(partner.id)]);

  return (
    <Shell partner={partner} active="/partner/payments">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-950">Payments</h1>
      </div>

      <div className="mt-6">
        <p className="text-[15px] text-slate-950">Balance owed to you</p>
        <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">{money(Math.max(0, totals.owed))}</p>
        <p className="mt-2.5 text-sm text-slate-600">Earned from sales on your links, minus what&apos;s already been paid</p>
      </div>

      <div className="mt-6 border-b border-slate-200/80 pb-6">
        <StatRow
          stats={[
            { label: "Total earned", value: money(totals.earned) },
            { label: "Total paid", value: money(totals.paid) },
          ]}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold text-slate-950">Payout history</h2>
        <Segmented items={[{ label: "Base44", active: true }]} />
      </div>
      {payouts.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-600">No payouts yet.</p>
      ) : (
        <div className={`mt-4 ${tableWrap}`}>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Brand</th>
                <th className={th}>Payment date</th>
                <th className={th}>Note</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {payouts.map((p, i) => (
                <tr key={i}>
                  <td className={td}>Base44</td>
                  <td className={td}>{date(p.at)}</td>
                  <td className={`${td} text-slate-600`}>{p.note || "–"}</td>
                  <td className={`${td} text-right tabular-nums`}>{money(p.amount)}</td>
                  <td className={`${td} text-right font-medium text-green-600`}>Paid</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
