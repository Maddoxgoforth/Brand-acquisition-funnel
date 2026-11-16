import Link from "next/link";

import type { Partner } from "@/lib/crm/partners";
import { partnerLogout } from "./actions";

const NAV = [
  { href: "/partner", label: "Dashboard", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/partner/links", label: "Your links", icon: "M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1" },
  { href: "/partner/payments", label: "Payments", icon: "M3 6h18v12H3zM3 10h18" },
];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";

// Sidebar + page frame for the signed-in partner pages.
export default function Shell({ partner, active, children }: { partner: Partner; active: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-2 py-4 md:flex">
        <div className="px-3 text-lg font-bold tracking-tight">Mad Media</div>
        <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white">MM</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Mad Media</p>
            <p className="text-xs text-slate-500">Partner</p>
          </div>
        </div>
        <nav className="mt-3 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${active === n.href ? "bg-slate-100 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 px-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{initials(partner.name)}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{partner.name}</p>
            <form action={partnerLogout}>
              <button type="submit" className="text-xs text-slate-500 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${active === n.href ? "bg-slate-100 font-semibold" : "text-slate-600"}`}>
              {n.label}
            </Link>
          ))}
          <form action={partnerLogout} className="ml-auto">
            <button type="submit" className="whitespace-nowrap px-3 py-1.5 text-sm text-slate-500">Sign out</button>
          </form>
        </div>
        <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-10">{children}</main>
      </div>
    </div>
  );
}
