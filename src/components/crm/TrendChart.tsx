"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatDuration } from "@/lib/crm/constants";
import type { TrendBucket, TrendKind, TrendResult } from "@/lib/crm/trendMetrics";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#e11d48", "#8b5cf6", "#06b6d4", "#64748b", "#84cc16"];
const PAD = { left: 52, right: 12, top: 12, bottom: 30 };
const HEIGHT = 280;

export function formatValue(kind: TrendKind, v: number | null) {
  if (v === null) return "–";
  if (kind === "percent") return `${(v * 100).toFixed(1)}%`;
  if (kind === "money") return `$${Math.round(v).toLocaleString("en-US")}`;
  if (kind === "seconds") return formatDuration(Math.round(v));
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}

// ---- Buckets in local time (matching the server's "YYYY-MM-DDTHH:MI") --------

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseKey = (k: string) => {
  const [date, time] = k.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi);
};

function truncate(d: Date, bucket: TrendBucket) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  if (bucket === "hour") return x;
  x.setHours(0);
  if (bucket === "week") x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday, like Postgres
  if (bucket === "month") x.setDate(1);
  return x;
}

function step(d: Date, bucket: TrendBucket) {
  const x = new Date(d);
  if (bucket === "hour") x.setHours(x.getHours() + 1);
  else if (bucket === "day") x.setDate(x.getDate() + 1);
  else if (bucket === "week") x.setDate(x.getDate() + 7);
  else x.setMonth(x.getMonth() + 1);
  return x;
}

// Every bucket from start to end, so empty hours/days show as zero.
export function bucketKeys(from: Date | null, to: Date, bucket: TrendBucket, firstKey: string | null) {
  const start = truncate(from ?? (firstKey ? parseKey(firstKey) : to), bucket);
  const keys: string[] = [];
  for (let d = start; d < to && keys.length < 5000; d = step(d, bucket)) keys.push(keyOf(d));
  return keys;
}

export function bucketLabel(key: string, bucket: TrendBucket, long = false) {
  const d = parseKey(key);
  if (bucket === "hour") {
    const hour = d.toLocaleTimeString("en-US", { hour: "numeric" });
    return long ? `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${hour}` : hour;
  }
  if (bucket === "month") return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const day = d.toLocaleDateString("en-US", long ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
  return bucket === "week" ? (long ? `Week of ${day}` : day) : day;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

// A bar chart (counts and money, stacked by series) or line chart (rates and
// times), with a tooltip for the bucket under the mouse or finger.
export default function TrendChart({
  result,
  kind,
  from,
  to,
}: {
  result: TrendResult;
  kind: TrendKind;
  from: Date | null;
  to: Date;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bars = kind === "count" || kind === "money";
  const { keys, table } = useMemo(() => {
    const sorted = [...result.points].sort((a, b) => a.b.localeCompare(b.b));
    const keys = bucketKeys(from, to, result.bucket, sorted[0]?.b ?? null);
    const index = new Map(keys.map((k, i) => [k, i]));
    const table = result.series.map(() => keys.map((): number | null => (bars ? 0 : null)));
    for (const p of result.points) {
      const i = index.get(p.b);
      const s = result.series.indexOf(p.s);
      if (i !== undefined && s >= 0) table[s][i] = p.v;
    }
    return { keys, table };
  }, [result, from, to, bars]);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = Math.max(keys.length, 1);
  const slot = plotW / n;
  const totals = keys.map((_, i) => table.reduce((sum, row) => sum + (row[i] ?? 0), 0));
  const rawMax = bars
    ? Math.max(0, ...totals)
    : Math.max(0, ...table.flat().map((v) => v ?? 0));
  // Whole-number gridlines for counts (4 gaps).
  const max =
    kind === "percent"
      ? Math.min(1, niceMax(rawMax)) || 1
      : kind === "count" || kind === "money"
        ? Math.max(4, Math.ceil(niceMax(rawMax) / 4) * 4)
        : niceMax(rawMax);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 80))));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - PAD.left) / slot);
    setHover(i >= 0 && i < keys.length ? i : null);
  };

  const sum = bars ? totals.reduce((a, b) => a + b, 0) : null;
  const tipLeft = hover === null ? 0 : Math.min(Math.max(PAD.left + slot * (hover + 0.5) - 90, 0), width - 180);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {sum !== null ? (
          <span className="font-extrabold">
            Total: {formatValue(kind, sum)}
          </span>
        ) : null}
        {result.series.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5 text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {s}
            {bars ? ` (${formatValue(kind, table[i].reduce<number>((a, b) => a + (b ?? 0), 0))})` : ""}
          </span>
        ))}
      </div>

      <div ref={wrap} className="relative w-full select-none">
        {keys.length === 0 || result.points.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            Nothing in this time frame yet.
          </p>
        ) : (
          <svg
            width={width}
            height={HEIGHT}
            className="block touch-none"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" />
                <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="fill-current text-[10px] text-muted">
                  {formatValue(kind, t)}
                </text>
              </g>
            ))}

            {hover !== null ? (
              <rect x={PAD.left + slot * hover} y={PAD.top} width={slot} height={plotH} className="fill-accent/10" />
            ) : null}

            {bars
              ? keys.map((k, i) => {
                  let base = 0;
                  const w = Math.max(1, slot * 0.7);
                  return (
                    <g key={k}>
                      {table.map((row, s) => {
                        const v = row[i] ?? 0;
                        if (v <= 0) return null;
                        const top = y(base + v);
                        const h = y(base) - top;
                        base += v;
                        return (
                          <rect
                            key={s}
                            x={PAD.left + slot * i + (slot - w) / 2}
                            y={top}
                            width={w}
                            height={Math.max(h, 0.5)}
                            rx={w > 6 ? 2 : 0}
                            fill={COLORS[s % COLORS.length]}
                          />
                        );
                      })}
                    </g>
                  );
                })
              : table.map((row, s) => {
                  const color = COLORS[s % COLORS.length];
                  const pts = row.map((v, i) => (v === null ? null : ([PAD.left + slot * (i + 0.5), y(v)] as const)));
                  // Break the line where there's no data.
                  const d = pts
                    .map((p, i) => (p ? `${i > 0 && pts[i - 1] ? "L" : "M"}${p[0]},${p[1]}` : ""))
                    .join("");
                  return (
                    <g key={s}>
                      <path d={d} fill="none" stroke={color} strokeWidth={2} />
                      {pts.map((p, i) =>
                        p && (n <= 60 || hover === i) ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 4 : 2.5} fill={color} /> : null
                      )}
                    </g>
                  );
                })}

            {keys.map((k, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={k}
                  x={PAD.left + slot * (i + 0.5)}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  className="fill-current text-[10px] text-muted"
                >
                  {bucketLabel(k, result.bucket)}
                </text>
              ) : null
            )}
          </svg>
        )}

        {hover !== null && keys[hover] ? (
          <div
            className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-xl border border-border bg-background p-3 text-xs shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="font-bold">{bucketLabel(keys[hover], result.bucket, true)}</p>
            {result.series.map((s, i) => (
              <p key={s} className="mt-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {s}
                </span>
                <span className="font-bold tabular-nums">{formatValue(kind, table[i][hover])}</span>
              </p>
            ))}
            {bars && result.series.length > 1 ? (
              <p className="mt-1 flex justify-between border-t border-border pt-1 font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatValue(kind, totals[hover])}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
