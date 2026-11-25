import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerPayouts, partnerTotals } from "@/lib/crm/partners";
import { partnerBatches, type Batch } from "@/lib/crm/partnerBatches";
import { accountTypeLabel, isBusinessAccount, payoutSummary, type PayoutSummary } from "@/lib/crm/payoutDetails";
import { savePartnerPayoutDetails } from "../actions";
import Shell from "../Shell";
import { Segmented, tableWrap, td, th } from "../ui";

export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
// Laid out like AffiliateConsulting's Payments tab (owner, Nov 21 2026).
const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayYear = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const longDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortIso = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
const STATUS: Record<Batch["status"], [string, string]> = {
  open: ["Upcoming", "text-amber-600"],
  holding: ["Upcoming", "text-amber-600"],
  ready: ["Upcoming", "text-amber-600"],
  approved: ["Processing", "text-indigo-600"],
  paid: ["Paid", "text-green-600"],
  carried: ["Carried over", "text-slate-600"],
};

const ERRORS: Record<string, string> = {
  missing_name: "Enter the name on the bank account.",
  bad_routing: "That routing number isn't valid. It's the 9-digit number on the bottom left of a check.",
  bad_account: "Enter your account number (4 to 17 digits).",
  account_mismatch: "The two account numbers don't match.",
  not_configured: "Payout setup isn't available right now. Please try again later.",
};

const input =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const label = "block text-sm font-medium text-slate-950";

function PayoutForm({ current, error }: { current: PayoutSummary | null; error?: string }) {
  return (
    <form action={savePartnerPayoutDetails} className="mt-4 grid gap-4 sm:grid-cols-2" autoComplete="off">
      <div className="sm:col-span-2">
        <label className={label} htmlFor="payee">Pay to</label>
        <select id="payee" name="payee" defaultValue={current && isBusinessAccount(current.accountType) ? "business" : "individual"} className={input}>
          <option value="individual">Individual (personal account)</option>
          <option value="business">Business (business account)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="holderName">Name on the account</label>
        <input id="holderName" name="holderName" required defaultValue={current?.holderName ?? ""} placeholder="Your full name, or the business's legal name" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="bankName">Bank name</label>
        <input id="bankName" name="bankName" defaultValue={current?.bankName ?? ""} placeholder="e.g. Chase" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="accountType">Account type</label>
        <select id="accountType" name="accountType" defaultValue={current?.accountType.endsWith("savings") ? "savings" : "checking"} className={input}>
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="routing">Routing number</label>
        <input id="routing" name="routing" required inputMode="numeric" maxLength={9} placeholder="9 digits" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="account">Account number</label>
        <input id="account" name="account" required inputMode="numeric" maxLength={17} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="accountConfirm">Confirm account number</label>
        <input id="accountConfirm" name="accountConfirm" required inputMode="numeric" maxLength={17} className={input} />
      </div>
      {error ? <p className="text-sm font-medium text-red-600 sm:col-span-2">{ERRORS[error] ?? ERRORS.not_configured}</p> : null}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Save payout details
        </button>
        {current ? (
          <Link href="/partner/payments" className="text-sm font-medium text-slate-600 hover:text-slate-950">Cancel</Link>
        ) : null}
      </div>
      <p className="flex items-center gap-1.5 text-[13px] text-slate-600 sm:col-span-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Encrypted and stored securely. Only used to send your payouts. US bank accounts only.
      </p>
    </form>
  );
}

export default async function PartnerPaymentsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const { saved, error, edit } = await searchParams;
  const [totals, payouts, method, allBatches] = await Promise.all([
    partnerTotals(partner.id),
    partnerPayouts(partner.id),
    payoutSummary(partner.id),
    partnerBatches(partner.id),
  ]);
  const batches = allBatches.filter((b) => b.status !== "carried");
  const editing = !method || edit === "1";
  const unpaid = batches.filter((b) => b.status !== "paid");
  const totalPending = Math.max(0, unpaid.reduce((s, b) => s + b.amount, 0));
  const next = [...unpaid].reverse().find((b) => b.amount > 0);

  return (
    <Shell partner={partner} active="/partner/payments">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-950">Payments</h1>
      </div>

      {saved ? (
        <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Payout details saved. You&apos;re all set to get paid.</p>
      ) : null}

      {editing ? (
        <div className={`mt-6 rounded-xl border p-5 ${method ? "border-slate-200/80" : "border-indigo-200 bg-indigo-50/40"}`}>
          <h2 className="text-[17px] font-semibold text-slate-950">{method ? "Update payout details" : "Set up payouts"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {method
              ? "Enter your bank details again to change where your payouts go."
              : "Add the bank account you want your commissions sent to. You only need to do this once."}
          </p>
          <PayoutForm current={method} error={error} />
        </div>
      ) : (
        <div className="mt-6 flex max-w-[810px] items-center justify-between gap-4 rounded-xl border border-slate-200/80 p-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] text-slate-950">
                Your next payout will be sent to {method.holderName} · Bank Transfer ·{" "}
                {method.bankName || "Bank account"} ({accountTypeLabel(method.accountType)}) •••• {method.accountLast4}
                {next ? ` · Next payout ${longDay(next.readyOn)}` : ""}
              </p>
              <p className="text-sm text-slate-600">Saved securely for your payouts</p>
            </div>
          </div>
          <Link href="/partner/payments?edit=1" className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-950 shadow-[0_1px_2px_rgba(11,19,36,0.06)] hover:bg-slate-50">
            Manage payout setup
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 border-t border-slate-200/80 pt-6">
        <div>
          <p className="text-[15px] text-slate-600">Total Pending</p>
          <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">{money(totalPending)}</p>
        </div>
        <div className="border-l border-slate-200/80 pl-6">
          <p className="text-[15px] text-slate-600">Total Paid</p>
          <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-slate-950 tabular-nums">{money(totals.paid)}</p>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-[26px] font-semibold text-slate-950">Payout history</h2>
        <Segmented items={[{ label: "Base44", active: true }, { label: "All brands", active: false }]} />
      </div>
      {batches.length === 0 && payouts.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-600">No payouts yet. Your first one shows up here after your first sale.</p>
      ) : (
        <div className={`mt-5 ${tableWrap}`}>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Brand</th>
                <th className={th}>Earning period</th>
                <th className={th}>Payment date</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Invoice</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {batches.map((b) => {
                const [label, color] = STATUS[b.status];
                const done = b.status === "paid" || b.status === "approved";
                return (
                  <tr key={b.periodStart}>
                    <td className={`${td} py-5`}>Base44</td>
                    <td className={`${td} py-5`}>
                      {day(b.periodStart)} – {dayYear(b.periodEnd)}
                    </td>
                    <td className={`${td} py-5`}>
                      {longDay(b.readyOn)}
                      {b.status === "paid" && b.paidAt ? (
                        <span className="block text-[13px] text-slate-500">
                          Paid {shortIso(b.paidAt)} · Expected {day(b.readyOn)}
                        </span>
                      ) : null}
                    </td>
                    <td className={`${td} py-5 text-right tabular-nums`}>{money(b.amount)}</td>
                    <td className={`${td} py-5 text-right`}>
                      {done ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[13px] font-medium text-emerald-700">Approved</span>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                    <td className={`px-3 py-5 text-right text-sm font-medium ${color}`}>{label}</td>
                  </tr>
                );
              })}
              {payouts.map((p, i) => (
                <tr key={`one-off-${i}`}>
                  <td className={`${td} py-5`}>Base44</td>
                  <td className="px-3 py-5 text-sm text-slate-600">{p.note || "Payment"}</td>
                  <td className={`${td} py-5`}>{date(p.at)}</td>
                  <td className={`${td} py-5 text-right tabular-nums`}>{money(p.amount)}</td>
                  <td className={`${td} py-5 text-right`}>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[13px] font-medium text-emerald-700">Approved</span>
                  </td>
                  <td className="px-3 py-5 text-right text-sm font-medium text-green-600">Paid</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
