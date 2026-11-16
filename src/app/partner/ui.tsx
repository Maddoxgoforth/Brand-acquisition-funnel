import Link from "next/link";

// Small shared pieces for the partner pages, styled after the
// AffiliateConsulting dashboard (slate text, indigo accent, hairline borders).

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// Green/red change chip next to a number ("↗ +12.5%").
export function Change({ value, points, empty }: { value: number | null; points?: boolean; empty?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return empty ? (
      <span className="ml-2 inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 align-middle text-xs font-medium text-emerald-600">↗ –</span>
    ) : null;
  }
  const up = value >= 0;
  const text = `${up ? "+" : ""}${(value * 100).toFixed(1)}${points ? "" : "%"}`;
  return <span className={`ml-1.5 text-[13px] font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>{text}</span>;
}

// Segmented control ("All brands | Base44", "1D 1W MTD ...").
export function Segmented({ items }: { items: { label: string; href?: string; active: boolean }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-[3px]">
      {items.map((i) => {
        const cls = `rounded-md px-2.5 py-[5px] text-sm transition-colors ${
          i.active ? "border border-[rgba(11,19,36,0.07)] bg-white font-semibold text-slate-950 shadow-[0_1px_2px_rgba(11,19,36,0.06)]" : "border border-transparent font-medium text-slate-600 hover:text-slate-950"
        }`;
        return i.href ? (
          <Link key={i.label} href={i.href} className={cls}>
            {i.label}
          </Link>
        ) : (
          <span key={i.label} className={cls}>
            {i.label}
          </span>
        );
      })}
    </div>
  );
}

// A row of numbers separated by thin vertical lines.
export function StatRow({ stats }: { stats: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-y-5 border-t border-slate-200/80 pt-5 sm:grid-cols-3 lg:flex lg:gap-y-0">
      {stats.map((s, i) => (
        <div key={s.label} className={`lg:flex-1 ${i ? "lg:border-l lg:border-slate-200/80 lg:pl-4" : ""}`}>
          <p className="text-sm font-medium text-slate-600">{s.label}</p>
          <p className="mt-1.5 text-xl font-semibold text-slate-950 tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export const tableWrap = "overflow-x-auto rounded-xl border border-slate-200/80";
export const th = "px-3 py-3 text-left text-[13px] font-medium uppercase tracking-wide text-slate-600";
export const td = "px-3 py-3.5 text-sm text-slate-950";
