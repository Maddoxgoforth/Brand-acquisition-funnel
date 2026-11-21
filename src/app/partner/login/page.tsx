import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerLogin } from "../actions";
import AuthCard, { field } from "../AuthCard";

const ERRORS: Record<string, string> = {
  wrong: "That email or password isn't right. Try again.",
  pending: "Your account is waiting for approval. You'll be able to sign in once it's approved.",
  disabled: "Your affiliate access has been removed.",
};

export default async function PartnerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  if (await getPartnerSession()) redirect("/partner");
  const { error, notice } = await searchParams;
  return (
    <AuthCard title="Sign in">
      {notice === "requested" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Account created. You can sign in once it&apos;s approved.
        </p>
      ) : null}
      <form action={partnerLogin}>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} />
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{ERRORS[error] ?? ERRORS.wrong}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-lg bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/partner/signup" className="font-medium text-indigo-600 hover:underline">New affiliate? Create an account</Link>
      </p>
    </AuthCard>
  );
}
