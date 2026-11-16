import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerSignup } from "../actions";
import AuthCard, { field } from "../AuthCard";

const ERRORS: Record<string, string> = {
  exists: "There's already an account with that email. Sign in instead.",
  invalid: "Fill in your name, a real email and a password of at least 8 characters.",
  full: "Too many accounts are waiting for approval right now. Try again later.",
};

export default async function PartnerSignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getPartnerSession()) redirect("/partner");
  const { error } = await searchParams;
  return (
    <AuthCard title="Create your account" subtitle="Once it's approved you'll get your links and your dashboard.">
      <form action={partnerSignup}>
        <label className="mt-6 block text-sm font-medium" htmlFor="name">Name</label>
        <input id="name" name="name" required autoComplete="name" className={field} />
        <label className="mt-4 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{ERRORS[error] ?? ERRORS.invalid}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-lg bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/partner/login" className="font-medium text-indigo-600 hover:underline">Already have an account? Sign in</Link>
      </p>
    </AuthCard>
  );
}
