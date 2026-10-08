import { redirect } from "next/navigation";

import { hasSession, isAuthConfigured } from "@/lib/crm/auth";
import { login } from "../actions";

export default async function CrmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasSession()) redirect("/crm");
  const { error } = await searchParams;
  const configured = isAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-elevated px-6">
      <form
        action={login}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Mad Media
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">CRM sign in</h1>

        {configured ? (
          <>
            <label className="mt-6 block text-sm font-semibold" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-border px-4 py-3 outline-none focus:border-accent"
            />
            {error ? (
              <p className="mt-3 text-sm font-semibold text-danger">
                Wrong password. Try again.
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-dim"
            >
              Sign in
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">
            The CRM is locked because no password is set yet. Add{" "}
            <code className="font-mono text-foreground">CRM_PASSWORD</code> and{" "}
            <code className="font-mono text-foreground">CRM_SESSION_SECRET</code>{" "}
            in the site&apos;s environment variables, then redeploy.
          </p>
        )}
      </form>
    </main>
  );
}
