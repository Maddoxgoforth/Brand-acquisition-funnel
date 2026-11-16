import "server-only";

import { PLAN_KEYS, PLAN_LABEL, type PartnerEvent, type PlanKey } from "@/lib/crm/partners";

// Dashboard numbers for one partner, worked out from their events in
// Eastern time (the owner's time zone).
export const RANGES = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "mtd", label: "MTD" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

const TZ = "America/New_York";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const day = (d: Date) => dayFmt.format(d); // YYYY-MM-DD
const addDays = (s: string, n: number) => new Date(Date.parse(`${s}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const shortDay = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = (s: string) => new Date(`${s}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

type Window = { from: string; to: string }; // inclusive day strings

function windows(range: RangeId, today: string, first: string | null): { cur: Window; prev: Window | null } {
  switch (range) {
    case "1d":
      return { cur: { from: today, to: today }, prev: { from: addDays(today, -1), to: addDays(today, -1) } };
    case "1w":
      return { cur: { from: addDays(today, -6), to: today }, prev: { from: addDays(today, -13), to: addDays(today, -7) } };
    case "mtd": {
      const from = `${today.slice(0, 7)}-01`;
      const dom = Number(today.slice(8));
      const lastMonth = addDays(from, -1).slice(0, 7);
      const lastDays = Number(addDays(from, -1).slice(8));
      return { cur: { from, to: today }, prev: { from: `${lastMonth}-01`, to: `${lastMonth}-${String(Math.min(dom, lastDays)).padStart(2, "0")}` } };
    }
    case "1y": {
      const from = addDays(minusYear(today), 1);
      return { cur: { from, to: today }, prev: { from: minusYear(from), to: addDays(from, -1) } };
    }
    default:
      return { cur: { from: first ?? today, to: today }, prev: null };
  }
}

const minusYear = (s: string) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
};
const inWin = (d: string, w: Window) => d >= w.from && d <= w.to;

function summarize(events: PartnerEvent[]) {
  const signups = events.filter((e) => e.kind === "signup").length;
  const purchases = events.filter((e) => e.kind === "purchase").length;
  const reversals = events.filter((e) => e.kind === "reversal").length;
  const earnings = events.reduce((s, e) => s + e.commission, 0);
  const isYearly = (e: PartnerEvent) => e.planKey.endsWith("yearly");
  const monthly = events.filter((e) => !isYearly(e)).reduce((s, e) => s + e.commission, 0);
  const yearly = events.filter(isYearly).reduce((s, e) => s + e.commission, 0);
  return { signups, purchases, reversals, earnings, monthly, yearly };
}

const change = (cur: number, prev: number | undefined) => (prev === undefined || prev === 0 ? null : (cur - prev) / prev);

export function buildDashboard(all: PartnerEvent[], range: RangeId) {
  const today = day(new Date());
  const withDay = all.map((e) => ({ ...e, day: day(new Date(e.at)) }));
  const { cur, prev } = windows(range, today, withDay[0]?.day ?? null);
  const curEvents = withDay.filter((e) => inWin(e.day, cur));
  const prevEvents = prev ? withDay.filter((e) => inWin(e.day, prev)) : null;
  const now = summarize(curEvents);
  const before = prevEvents ? summarize(prevEvents) : null;

  // Chart buckets: hours for 1D, months for 1Y / All, days otherwise.
  let buckets: { key: string; label: string }[] = [];
  let keyOf: (e: (typeof withDay)[number]) => string;
  if (range === "1d") {
    buckets = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}` }));
    keyOf = (e) => String(Number(hourFmt.format(new Date(e.at))) % 24);
  } else if (range === "1y" || range === "all") {
    let m = cur.from.slice(0, 7);
    const end = cur.to.slice(0, 7);
    while (m <= end && buckets.length < 120) {
      buckets.push({ key: m, label: monthLabel(m) });
      const next = addDays(`${m}-28`, 5).slice(0, 7);
      m = next;
    }
    keyOf = (e) => e.day.slice(0, 7);
  } else {
    for (let d = cur.from; d <= cur.to; d = addDays(d, 1)) buckets.push({ key: d, label: shortDay(d) });
    keyOf = (e) => e.day;
  }
  const sums = new Map<string, number>();
  for (const e of curEvents) sums.set(keyOf(e), (sums.get(keyOf(e)) ?? 0) + e.commission);
  const series = buckets.map((b) => ({ label: b.label, value: Math.round((sums.get(b.key) ?? 0) * 100) / 100 }));

  // Plans and countries (purchases minus reversals).
  const plans = PLAN_KEYS.map((k: PlanKey) => {
    const sales = curEvents.filter((e) => e.planKey === k && e.kind === "purchase").length - curEvents.filter((e) => e.planKey === k && e.kind === "reversal").length;
    const earned = curEvents.filter((e) => e.planKey === k).reduce((s, e) => s + e.commission, 0);
    return { plan: PLAN_LABEL[k][0], billing: PLAN_LABEL[k][1], sales, earned };
  }).filter((p) => p.sales !== 0 || p.earned !== 0);
  const countryMap = new Map<string, { sales: number; earned: number }>();
  for (const e of curEvents) {
    if (e.kind === "signup") continue;
    const c = e.country || "Unknown";
    const row = countryMap.get(c) ?? { sales: 0, earned: 0 };
    row.sales += e.kind === "purchase" ? 1 : -1;
    row.earned += e.commission;
    countryMap.set(c, row);
  }
  const countries = [...countryMap.entries()].map(([country, v]) => ({ country, ...v })).sort((a, b) => b.earned - a.earned);
  const yearlySales = curEvents.filter((e) => e.kind === "purchase" && e.planKey.endsWith("yearly")).length;

  // Sales this calendar month, for the banner.
  const monthStart = `${today.slice(0, 7)}-01`;
  const salesThisMonth = withDay.filter((e) => e.day >= monthStart && e.kind === "purchase").length;

  return {
    range,
    from: cur.from,
    to: cur.to,
    ...now,
    conversion: now.signups ? now.purchases / now.signups : 0,
    prevEarnings: before?.earnings ?? null,
    changes: {
      earnings: change(now.earnings, before?.earnings),
      signups: change(now.signups, before?.signups),
      purchases: change(now.purchases, before?.purchases),
      conversion: before && before.signups ? now.purchases / (now.signups || 1) - before.purchases / before.signups : null,
    },
    series,
    plans,
    countries,
    yearlyRatio: now.purchases ? yearlySales / now.purchases : 0,
    yearlySales,
    salesThisMonth,
  };
}
