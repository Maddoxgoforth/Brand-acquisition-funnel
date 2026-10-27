"use client";

import { useEffect, useState } from "react";

import { STAT_RANGES, type StatRange, type Stats } from "@/lib/crm/constants";
import { crmFetch } from "./api";

export function percent(value: number | null) {
  return value === null ? "–" : `${(value * 100).toFixed(1)}%`;
}

export function StatCard({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-accent/40 bg-accent/5" : "border-border bg-background"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

export function RangePicker({
  range,
  onChange,
}: {
  range: StatRange;
  onChange: (range: StatRange) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background p-1">
      {STAT_RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            r.id === range
              ? "bg-accent text-white"
              : "text-muted hover:bg-background-elevated hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// "the past 30 days" / "all time"
export function rangeText(range: StatRange) {
  const label = STAT_RANGES.find((r) => r.id === range)!.label;
  return range === "all" ? "all time" : `the past ${label.toLowerCase()}`;
}

// Loads the stats for a range; reloads when `refreshKey` changes. Returns
// null while the numbers for the picked range are loading.
export function useStats(
  range: StatRange,
  refreshKey: number,
  onError: (error: unknown) => void
) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let cancelled = false;
    crmFetch<Stats>(`/api/crm/stats?range=${range}`)
      .then((data) => !cancelled && setStats(data))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey, onError]);
  return stats?.range === range ? stats : null;
}
