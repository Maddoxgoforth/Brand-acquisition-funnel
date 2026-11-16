"use client";

import { useState } from "react";

// Earnings line chart (plain SVG): one point per bucket, hover or tap a
// point to see its value.
export default function EarningsChart({ series }: { series: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = 280, PAD = 8;
  const max = Math.max(1, ...series.map((s) => s.value));
  const min = Math.min(0, ...series.map((s) => s.value));
  const n = Math.max(1, series.length - 1);
  const x = (i: number) => PAD + (i / n) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
  const line = series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  const active = hover ?? null;
  const money = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="relative mt-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full md:h-72"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        {series.map((_, i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={PAD} y2={H - PAD} stroke="#eef0f4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="#4f46e5" fillOpacity={0.07} />
        <path d={line} fill="none" stroke="#4f46e5" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {series.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (W / series.length) / 2}
            y={0}
            width={W / series.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
      {active !== null && series[active] ? (
        <>
          <span
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 bg-white"
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(series[active].value) / H) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-xs shadow-sm"
            style={{ left: `${Math.min(90, Math.max(10, (x(active) / W) * 100))}%`, top: 0 }}
          >
            <p className="text-slate-500">{series[active].label}</p>
            <p className="font-semibold">{money(series[active].value)}</p>
          </div>
        </>
      ) : null}
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}
