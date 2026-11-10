"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { STAT_RANGES, type StatRange, type Stats } from "@/lib/crm/constants";
import type { TrendList, TrendMetricId } from "@/lib/crm/trendMetrics";
import { crmFetch } from "./api";
import TrendDialog from "./TrendDialog";

export function percent(value: number | null) {
  return value === null ? "–" : `${(value * 100).toFixed(1)}%`;
}

// ---- Time frame: a preset, or custom dates -----------------------------------

// `from` / `to` are local dates (YYYY-MM-DD), used when range is "custom".
export type Frame = { range: StatRange; from: string; to: string };

export const dateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function frameOf(range: StatRange): Frame {
  return { range, from: dateInput(new Date(Date.now() - 6 * 86400_000)), to: dateInput(new Date()) };
}

// The frame as ISO times; null = open-ended. Custom dates are whole local days.
export function frameWindow(f: Frame): { from: string | null; to: string | null } {
  if (f.range === "custom") {
    const a = f.from ? new Date(`${f.from}T00:00:00`) : null;
    const b = f.to ? new Date(`${f.to}T00:00:00`) : null;
    if (b) b.setDate(b.getDate() + 1);
    return { from: a ? a.toISOString() : null, to: b ? b.toISOString() : null };
  }
  const days = STAT_RANGES.find((r) => r.id === f.range)!.days;
  return { from: days === null ? null : new Date(Date.now() - days * 86400_000).toISOString(), to: null };
}

const fmtDate = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// "the past 30 days" / "all time" / "Nov 1, 2026 – Nov 10, 2026"
export function rangeText(f: Frame) {
  if (f.range === "custom") {
    if (f.from && f.to) return `${fmtDate(f.from)} – ${fmtDate(f.to)}`;
    if (f.from) return `since ${fmtDate(f.from)}`;
    if (f.to) return `up to ${fmtDate(f.to)}`;
    return "all time";
  }
  const label = STAT_RANGES.find((r) => r.id === f.range)!.label;
  return f.range === "all" ? "all time" : `the past ${label.toLowerCase()}`;
}

const dateField = "rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function RangePicker({ frame, onChange }: { frame: Frame; onChange: (frame: Frame) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background p-1">
        {STAT_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange({ ...frame, range: r.id })}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              r.id === frame.range
                ? "bg-accent text-white"
                : "text-muted hover:bg-background-elevated hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {frame.range === "custom" ? (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <input
            className={dateField}
            type="date"
            value={frame.from}
            max={frame.to || undefined}
            onChange={(e) => onChange({ ...frame, from: e.target.value })}
          />
          to
          <input
            className={dateField}
            type="date"
            value={frame.to}
            min={frame.from || undefined}
            onChange={(e) => onChange({ ...frame, to: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---- Clickable stat cards → graph --------------------------------------------

// What a stat card graphs when clicked.
export type ChartSpec = {
  metric: TrendMetricId;
  actor?: string; // one person only
  actorName?: string;
  list?: TrendList;
  byPerson?: boolean;
};

// The page's time frame and who is looking, for the graphs its cards open.
export const ChartContext = createContext<{ frame: Frame; owner: boolean }>({
  frame: frameOf("7d"),
  owner: false,
});

export function StatCard({
  label,
  value,
  detail,
  highlight,
  chart,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
  chart?: ChartSpec;
}) {
  const [open, setOpen] = useState(false);
  const ctx = useContext(ChartContext);
  const box = `rounded-2xl border p-5 ${highlight ? "border-accent/40 bg-accent/5" : "border-border bg-background"}`;
  const body = (
    <>
      <p className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-muted">
        {label}
        {chart ? <span className="text-[10px] normal-case tracking-normal text-accent">📈 Graph</span> : null}
      </p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </>
  );
  if (!chart) return <div className={box}>{body}</div>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${box} text-left transition-shadow hover:shadow-md hover:ring-2 hover:ring-accent/30`}
      >
        {body}
      </button>
      {open ? (
        <TrendDialog spec={chart} frame={ctx.frame} owner={ctx.owner} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

// ---- Loading the numbers -----------------------------------------------------

function statsUrl(f: Frame) {
  if (f.range !== "custom") return `/api/crm/stats?range=${f.range}`;
  const w = frameWindow(f);
  const q = new URLSearchParams({ range: "custom" });
  if (w.from) q.set("from", w.from);
  if (w.to) q.set("to", w.to);
  return `/api/crm/stats?${q}`;
}

// Loads the stats for a time frame; reloads when `refreshKey` changes.
// Returns null while the numbers for the picked frame are loading.
export function useStats(frame: Frame, refreshKey: number, onError: (error: unknown) => void) {
  const url = statsUrl(frame);
  const [loaded, setLoaded] = useState<{ url: string; stats: Stats } | null>(null);
  useEffect(() => {
    let cancelled = false;
    crmFetch<Stats>(url)
      .then((data) => !cancelled && setLoaded({ url, stats: data }))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [url, refreshKey, onError]);
  return loaded?.url === url ? loaded.stats : null;
}
