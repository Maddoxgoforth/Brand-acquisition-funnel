// Shared frame for the partner sign-in and sign-up pages.
export const field =
  "mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">MM</span>
          <span className="text-sm font-semibold">Mad Media</span>
          <span className="text-xs text-slate-400">Partners</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        {children}
      </div>
    </main>
  );
}
