// Shared frame for the partner sign-in and sign-up pages.
export const field =
  "mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200/80 bg-white p-8 shadow-[0_2px_8px_rgba(11,19,36,0.04)]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-slate-950 text-[10px] font-bold text-white">M</span>
          <span className="text-[17px] font-semibold tracking-tight">Media Affiliate</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
        {children}
      </div>
    </main>
  );
}
