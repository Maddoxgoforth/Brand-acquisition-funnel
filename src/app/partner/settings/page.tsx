import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { payoutSummary } from "@/lib/crm/payoutDetails";
import { changePartnerPasswordAction, savePartnerProfileAction } from "../actions";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing_name: "Enter your name.",
  wrong_current: "Your current password isn't right.",
  too_short: "Your new password needs at least 8 characters.",
  mismatch: "The new passwords don't match.",
};
const input =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const section = "rounded-xl border border-slate-200/80 bg-slate-50/50";
const sectionTitle = "text-[13px] font-medium uppercase tracking-wide text-slate-600";
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";

export default async function PartnerSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const { saved, error } = await searchParams;
  const method = await payoutSummary(partner.id);
  const passwordError = error && error !== "missing_name";

  return (
    <Shell partner={partner} active="/partner/settings">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-950">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-600">Your profile, sign-in and payout details.</p>
      </div>

      {saved ? (
        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {saved === "password" ? "Password changed." : "Profile saved."}
        </p>
      ) : null}

      <div className="mt-6 max-w-[720px] space-y-6">
        <form action={savePartnerProfileAction} className={section}>
          <div className="p-5">
            <p className={sectionTitle}>Profile</p>
            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white">{initials(partner.name)}</span>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-950">{partner.name}</p>
                <p>Partner since {new Date(partner.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-950" htmlFor="name">Name</label>
                <input id="name" name="name" required maxLength={80} defaultValue={partner.name} className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-950" htmlFor="email">Email</label>
                <input id="email" value={partner.email} readOnly disabled className={`${input} bg-slate-100 text-slate-500`} />
                <p className="mt-1 text-xs text-slate-500">Your sign-in email. Contact us to change it.</p>
              </div>
            </div>
            {error === "missing_name" ? <p className="mt-3 text-sm font-medium text-red-600">{ERRORS.missing_name}</p> : null}
          </div>
          <div className="flex justify-end border-t border-slate-200/80 px-5 py-3">
            <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save changes</button>
          </div>
        </form>

        <form action={changePartnerPasswordAction} className={section} autoComplete="off">
          <div className="p-5">
            <p className={sectionTitle}>Password</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-950" htmlFor="current">Current password</label>
                <input id="current" name="current" type="password" required autoComplete="current-password" className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-950" htmlFor="next">New password</label>
                <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-950" htmlFor="confirm">Confirm new password</label>
                <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
              </div>
            </div>
            {passwordError ? <p className="mt-3 text-sm font-medium text-red-600">{ERRORS[error!] ?? "Something went wrong. Try again."}</p> : null}
          </div>
          <div className="flex justify-end border-t border-slate-200/80 px-5 py-3">
            <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Change password</button>
          </div>
        </form>

        <div className={`${section} flex items-center justify-between gap-4 p-5`}>
          <div>
            <p className={sectionTitle}>Payout method</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {method
                ? `${method.bankName || "Bank account"} · ${method.accountType === "savings" ? "Savings" : "Checking"} •••• ${method.accountLast4}`
                : "Not set up yet"}
            </p>
            {!method ? <p className="text-sm text-slate-600">Add your bank details to get paid.</p> : null}
          </div>
          <Link
            href={method ? "/partner/payments?edit=1" : "/partner/payments"}
            className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-slate-50"
          >
            {method ? "Edit" : "Set up payouts"}
          </Link>
        </div>
      </div>
    </Shell>
  );
}
