import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession, isAuthConfigured } from "@/lib/crm/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/crm/users";
import { signup } from "../actions";

const field =
  "mt-2 w-full rounded-lg border border-border px-4 py-3 outline-none focus:border-accent";

const ERRORS: Record<string, string> = {
  exists: "There's already an account with that email. Try signing in.",
  invalid: `Enter your name, a real email, and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  full: "Too many accounts are waiting for approval right now. Ask Maddox to review them.",
};

export default async function CrmSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/crm");
  if (!isAuthConfigured()) redirect("/crm/login");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-elevated px-6">
      <form
        action={signup}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Mad Media
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">Create your CRM account</h1>
        <p className="mt-2 text-sm text-muted">
          Maddox approves each account before it can sign in.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="name">
          Your name
        </label>
        <input id="name" name="name" required autoFocus autoComplete="name" maxLength={100} className={field} />

        <label className="mt-4 block text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />

        <label className="mt-4 block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={field}
        />
        <p className="mt-1 text-xs text-muted">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>

        {error ? (
          <p className="mt-3 text-sm font-semibold text-danger">
            {ERRORS[error] ?? ERRORS.invalid}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-dim"
        >
          Request access
        </button>
        <p className="mt-6 text-sm font-semibold">
          <Link href="/crm/login" className="text-accent hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
