import Link from "next/link";
import { redirect } from "next/navigation";

import { getAffiliateSession } from "@/lib/crm/affiliateAuth";
import { affiliateLogin } from "../actions";
import AuthCard, { field } from "../AuthCard";

const ERRORS: Record<string, string> = {
  wrong: "That email or password isn't right. Try again.",
  pending: "Your account is waiting for approval. You'll be able to sign in once Maddox approves it.",
  disabled: "Your affiliate access has been removed.",
};

export default async function AffiliateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  if (await getAffiliateSession()) redirect("/affiliates");
  const { error, notice } = await searchParams;
  return (
    <AuthCard title="Affiliate sign in">
      {notice === "requested" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Account created. You can sign in once Maddox approves it.
        </p>
      ) : null}
      <form action={affiliateLogin}>
        <label className="mt-6 block text-sm font-semibold" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        <label className="mt-4 block text-sm font-semibold" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} />
        {error ? <p className="mt-3 text-sm font-semibold text-danger">{ERRORS[error] ?? ERRORS.wrong}</p> : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-dim">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm font-semibold">
        <Link href="/affiliates/signup" className="text-accent hover:underline">New affiliate? Create an account</Link>
      </p>
    </AuthCard>
  );
}
