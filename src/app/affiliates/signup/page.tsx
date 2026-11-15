import Link from "next/link";
import { redirect } from "next/navigation";

import { getAffiliateSession } from "@/lib/crm/affiliateAuth";
import { MIN_PASSWORD_LENGTH } from "@/lib/crm/users";
import { affiliateSignup } from "../actions";
import AuthCard, { field } from "../AuthCard";

const ERRORS: Record<string, string> = {
  exists: "There's already an account with that email. Try signing in.",
  invalid: `Enter your name, a real email, and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  full: "Too many accounts are waiting for approval right now. Try again later.",
};

export default async function AffiliateSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAffiliateSession()) redirect("/affiliates");
  const { error } = await searchParams;
  return (
    <AuthCard
      title="Become an affiliate"
      subtitle="Create your account. Once Maddox approves it you'll get your own link and a dashboard with your opt-ins, closes and earnings."
    >
      <form action={affiliateSignup}>
        <label className="mt-6 block text-sm font-semibold" htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" maxLength={100} className={field} />
        <label className="mt-4 block text-sm font-semibold" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        <label className="mt-4 block text-sm font-semibold" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={field} />
        <p className="mt-1 text-xs text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>
        {error ? <p className="mt-3 text-sm font-semibold text-danger">{ERRORS[error] ?? ERRORS.invalid}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-dim">
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm font-semibold">
        <Link href="/affiliates/login" className="text-accent hover:underline">Already have an account? Sign in</Link>
      </p>
    </AuthCard>
  );
}
