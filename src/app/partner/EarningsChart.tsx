"use client";

import { useState } from "react";

// Earnings line chart (plain SVG) styled after the AffiliateConsulting chart:
// thin vertical guides, a 2px indigo line over a pale indigo fill, and a white
// tooltip with the bucket and its value on hover/tap.
export default function EarningsChart({ series }: { series: { label: string; value: number }[] }) {
  const last = Math.max(0, series.length - 1);
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = 300, TOP = 12, BOTTOM = 4;
  const max = Math.max(1, ...series.map((s) => s.value));
  const min = Math.min(0, ...series.map((s) => s.value));
  const x = (i: number) => (last ? (i / last) * W : W / 2);
  const y = (v: number) => H - BOTTOM - ((v - min) / (max - min || 1)) * (H - TOP - BOTTOM);
  const pts = series.map((s, i) => [x(i), y(s.value)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${x(last).toFixed(1)},${H} L0,${H} Z` : "";
  const shown = hover ?? last;
  const money = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const guides = Math.min(series.length, 24);

  return (
    <div className="relative mt-2 select-none pt-14">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full overflow-visible md:h-[300px]" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: guides }, (_, i) => {
            const gx = guides > 1 ? (i / (guides - 1)) * W : 0;
            return <line key={i} x1={gx} x2={gx} y1={0} y2={H} stroke="#eef1f5" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
          })}
          <path d={area} fill="#e0e7ff" fillOpacity={0.5} />
          <path d={line} fill="none" stroke="#4f46e5" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {series.map((_, i) => (
            <rect
              key={i}
              x={x(i) - W / Math.max(1, series.length) / 2}
              y={0}
              width={W / Math.max(1, series.length)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>
        {series[shown] ? (
          <>
            <span
              className="pointer-events-none absolute h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 bg-white"
              style={{ left: `${(x(shown) / W) * 100}%`, top: `${(y(series[shown].value) / H) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-center shadow-[0_2px_8px_rgba(11,19,36,0.06)]"
              style={{
                left: `${Math.min(92, Math.max(8, (x(shown) / W) * 100))}%`,
                top: `${(y(series[shown].value) / H) * 100}%`,
              }}
            >
              <p className="text-[13px] text-slate-600">{series[shown].label}</p>
              <p className="text-sm font-semibold text-slate-950">{money(series[shown].value)}</p>
            </div>
          </>
        ) : null}
      </div>
      <div className="mt-2.5 flex justify-between text-[13px] text-slate-600">
        <span>{series[0]?.label}</span>
        <span>{series[last]?.label}</span>
      </div>
    </div>
  );
}
