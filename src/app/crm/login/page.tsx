import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession, isAuthConfigured } from "@/lib/crm/auth";
import { login, ownerLogin } from "../actions";

const field =
  "mt-2 w-full rounded-lg border border-border px-4 py-3 outline-none focus:border-accent";

const ERRORS: Record<string, string> = {
  wrong: "That email or password isn't right. Try again.",
  pending: "Your account hasn't been approved yet. Ask Maddox to approve it.",
  disabled: "Your access to this CRM has been removed.",
};

export default async function CrmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; owner?: string; notice?: string }>;
}) {
  if (await getSession()) redirect("/crm");
  const { error, owner, notice } = await searchParams;
  const asOwner = owner === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-elevated px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Mad Media
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {asOwner ? "Owner sign in" : "CRM sign in"}
        </h1>

        {!isAuthConfigured() ? (
          <p className="mt-4 text-sm text-muted">
            The CRM is locked because no password is set yet. Add{" "}
            <code className="font-mono text-foreground">CRM_PASSWORD</code> and{" "}
            <code className="font-mono text-foreground">CRM_SESSION_SECRET</code>{" "}
            in the site&apos;s environment variables, then redeploy.
          </p>
        ) : (
          <>
            {notice === "requested" ? (
              <p className="mt-4 rounded-lg bg-background-elevated px-4 py-3 text-sm font-semibold">
                Account created. You can sign in as soon as Maddox approves it.
              </p>
            ) : null}

            <form action={asOwner ? ownerLogin : login}>
              {asOwner ? null : (
                <>
                  <label className="mt-6 block text-sm font-semibold" htmlFor="email">
                    Email
                  </label>
                  <input id="email" name="email" type="email" required autoFocus autoComplete="email" className={field} />
                </>
              )}
              <label className="mt-4 block text-sm font-semibold" htmlFor="password">
                {asOwner ? "Owner password" : "Password"}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus={asOwner}
                autoComplete="current-password"
                className={field}
              />
              {error ? (
                <p className="mt-3 text-sm font-semibold text-danger">
                  {asOwner ? "Wrong password. Try again." : ERRORS[error] ?? ERRORS.wrong}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-dim"
              >
                Sign in
              </button>
            </form>

            <div className="mt-6 flex justify-between text-sm font-semibold">
              {asOwner ? (
                <Link href="/crm/login" className="text-accent hover:underline">
                  Team sign in
                </Link>
              ) : (
                <>
                  <Link href="/crm/signup" className="text-accent hover:underline">
                    Create an account
                  </Link>
                  <Link href="/crm/login?owner=1" className="text-muted hover:underline">
                    Owner sign in
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
