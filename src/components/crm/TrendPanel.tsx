"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TREND_BUCKETS,
  TREND_METRICS,
  trendMetric,
  type TrendBucket,
  type TrendList,
  type TrendMetricId,
  type TrendResult,
} from "@/lib/crm/trendMetrics";
import { crmFetch } from "./api";
import { RangePicker, frameWindow, rangeText, type ChartSpec, type Frame } from "./statsUi";
import TrendChart from "./TrendChart";

const BUCKET_LABEL: Record<TrendBucket, string> = { hour: "Hourly", day: "Daily", week: "Weekly", month: "Monthly" };
const select = "rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold";

// Picks hours for short frames, then days, weeks, months.
function autoBucket(from: Date | null, to: Date): TrendBucket {
  if (!from) return "week";
  const days = (to.getTime() - from.getTime()) / 86400_000;
  if (days <= 3) return "hour";
  if (days <= 120) return "day";
  if (days <= 730) return "week";
  return "month";
}

// A graph of one CRM number over time, with its own controls: which number,
// time frame (presets or custom dates), hourly/daily/weekly/monthly, and for
// team numbers, all together or one line per person.
export default function TrendPanel({
  spec,
  frame: initialFrame,
  owner,
  onError,
}: {
  spec: ChartSpec;
  frame: Frame;
  owner: boolean;
  onError?: (error: unknown) => void;
}) {
  const [metric, setMetric] = useState<TrendMetricId>(spec.metric);
  const [frame, setFrame] = useState(initialFrame);
  const [bucketChoice, setBucketChoice] = useState<TrendBucket | "auto">("auto");
  const [byPerson, setByPerson] = useState(Boolean(spec.byPerson));
  const [list, setList] = useState<TrendList>(spec.list ?? "all");
  const [onlyActor, setOnlyActor] = useState(Boolean(spec.actor));
  const [data, setData] = useState<{ url: string; result: TrendResult } | null>(null);
  const [failed, setFailed] = useState<{ url: string; message: string } | null>(null);

  const def = trendMetric(metric);
  const choices = TREND_METRICS.filter((m) => owner || !("ownerOnly" in m && m.ownerOnly));

  // Fixed for this frame, so a preset doesn't refetch on every render.
  const win = useMemo(() => {
    const w = frameWindow(frame);
    return { from: w.from ? new Date(w.from) : null, to: w.to ? new Date(w.to) : new Date() };
  }, [frame]);
  let bucket = bucketChoice === "auto" ? autoBucket(win.from, win.to) : bucketChoice;
  // Hourly over a long or open-ended frame would be thousands of bars.
  if (bucket === "hour" && (!win.from || win.to.getTime() - win.from.getTime() > 31 * 86400_000)) bucket = "day";

  const url = useMemo(() => {
    const q = new URLSearchParams({ metric, bucket, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (win.from) q.set("from", win.from.toISOString());
    q.set("to", win.to.toISOString());
    if (def.lists && list !== "all") q.set("list", list);
    if (def.byPerson && byPerson) q.set("split", "person");
    if (onlyActor && spec.actor) q.set("actor", spec.actor);
    return `/api/crm/trends?${q}`;
  }, [metric, bucket, win, def, list, byPerson, onlyActor, spec.actor]);

  useEffect(() => {
    let cancelled = false;
    crmFetch<TrendResult>(url)
      .then((result) => !cancelled && setData({ url, result }))
      .catch((e) => {
        if (cancelled) return;
        setFailed({ url, message: e instanceof Error ? e.message : "Couldn't load the graph" });
        onError?.(e);
      });
    return () => {
      cancelled = true;
    };
  }, [url, onError]);

  const result = data?.url === url ? data.result : null;
  const error = failed?.url === url ? failed.message : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={metric} onChange={(e) => setMetric(e.target.value as TrendMetricId)}>
          {choices.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select className={select} value={bucketChoice} onChange={(e) => setBucketChoice(e.target.value as TrendBucket | "auto")}>
          <option value="auto">Auto ({BUCKET_LABEL[bucket].toLowerCase()})</option>
          {TREND_BUCKETS.map((b) => (
            <option key={b} value={b}>
              {BUCKET_LABEL[b]}
            </option>
          ))}
        </select>
        {def.lists ? (
          <select className={select} value={list} onChange={(e) => setList(e.target.value as TrendList)}>
            <option value="all">All lists</option>
            <option value="optin">Free course opt-ins</option>
            <option value="dial">Leads to dial</option>
          </select>
        ) : null}
        {def.byPerson ? (
          <select className={select} value={byPerson ? "person" : "all"} onChange={(e) => setByPerson(e.target.value === "person")}>
            <option value="all">Everyone together</option>
            <option value="person">One line per person</option>
          </select>
        ) : null}
        {spec.actor ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={onlyActor} onChange={(e) => setOnlyActor(e.target.checked)} />
            Only {spec.actorName ?? "this person"}
          </label>
        ) : null}
      </div>

      <RangePicker frame={frame} onChange={setFrame} />

      <p className="text-sm text-muted">
        {def.label}, {rangeText(frame)}, {BUCKET_LABEL[bucket].toLowerCase()}. Hover over the graph to see each{" "}
        {bucket}.
      </p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : !result ? (
        <p className="p-10 text-center text-sm text-muted">Loading graph…</p>
      ) : (
        <TrendChart result={result} kind={def.kind} from={win.from} to={win.to} />
      )}
    </div>
  );
}
