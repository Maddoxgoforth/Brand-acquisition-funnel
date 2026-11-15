// Shared frame for the affiliate sign-in and sign-up pages.
export const field = "mt-2 w-full rounded-lg border border-border px-4 py-3 outline-none focus:border-accent";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-elevated px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Maddox · Affiliates</p>
        <h1 className="mt-1 text-2xl font-extrabold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
        {children}
      </div>
    </main>
  );
}
