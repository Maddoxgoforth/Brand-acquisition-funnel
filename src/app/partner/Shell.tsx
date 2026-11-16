import Link from "next/link";

import type { Partner } from "@/lib/crm/partners";
import { partnerLogout } from "./actions";

const NAV = [
  {
    href: "/partner",
    label: "Dashboard",
    icon: "M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z",
  },
  {
    href: "/partner/links",
    label: "Your links",
    icon: "M10 13.5a4.5 4.5 0 0 0 6.36 0l3.18-3.18a4.5 4.5 0 0 0-6.36-6.36L12 5.14M14 10.5a4.5 4.5 0 0 0-6.36 0l-3.18 3.18a4.5 4.5 0 0 0 6.36 6.36L12 18.86",
  },
  {
    href: "/partner/payments",
    label: "Payments",
    icon: "M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h3",
  },
];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Sidebar + page frame for the signed-in partner pages.
export default function Shell({ partner, active, children }: { partner: Partner; active: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-slate-200/70 bg-white px-3 pb-4 pt-5 md:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-slate-950 text-[10px] font-bold text-white">M</span>
          <span className="text-[17px] font-semibold tracking-tight text-slate-950">Mad Media</span>
        </div>

        <div className="mt-6 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-xs font-semibold text-white">MM</span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold text-slate-900">Mad Media</p>
            <p className="text-[13px] text-slate-600">Partner</p>
          </div>
        </div>

        <nav className="mt-4 space-y-0.5">
          {NAV.map((n) => {
            const on = active === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  on ? "bg-slate-200/80 font-semibold text-slate-950" : "font-medium text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon d={n.icon} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{initials(partner.name)}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900">{partner.name}</p>
            <form action={partnerLogout}>
              <button type="submit" className="text-xs text-slate-600 hover:text-slate-950">Sign out</button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/70 px-4 py-2.5 md:hidden">
          <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-slate-950 text-[10px] font-bold text-white">M</span>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${active === n.href ? "bg-slate-200/80 font-semibold text-slate-950" : "font-medium text-slate-600"}`}
            >
              {n.label}
            </Link>
          ))}
          <form action={partnerLogout} className="ml-auto">
            <button type="submit" className="whitespace-nowrap px-2 py-1.5 text-sm text-slate-500">Sign out</button>
          </form>
        </div>
        <main className="mx-auto w-full max-w-[1060px] px-5 py-6 md:px-10 md:py-7">{children}</main>
      </div>
    </div>
  );
}
