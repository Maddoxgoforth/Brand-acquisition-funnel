"use client";

import { useMemo, useState } from "react";

import { formatDuration, type LeaderboardRow, type StatRange } from "@/lib/crm/constants";
import { RangePicker, percent, rangeText, useStats } from "./statsUi";

// What the leaderboard can be ranked by. Speed to lead ranks lowest first.
const METRICS = [
  { id: "closes", label: "Closes" },
  { id: "booked", label: "Booked" },
  { id: "dials", label: "Dials" },
  { id: "closeRate", label: "Close rate" },
  { id: "showRate", label: "Show rate" },
  { id: "speed", label: "Speed to lead" },
] as const;
type Metric = (typeof METRICS)[number]["id"];

function metricValue(row: LeaderboardRow, metric: Metric): number | null {
  if (metric === "closeRate") return row.closeRate;
  if (metric === "showRate") return row.showRate;
  if (metric === "speed") return row.avgSpeedSeconds;
  return row[metric];
}

function showMetric(row: LeaderboardRow, metric: Metric) {
  const v = metricValue(row, metric);
  if (metric === "closeRate" || metric === "showRate") return percent(v);
  if (metric === "speed") return v === null ? "–" : formatDuration(v);
  return String(v ?? 0);
}

function rank(rows: LeaderboardRow[], metric: Metric) {
  return [...rows].sort((a, b) => {
    const [x, y] = [metricValue(a, metric), metricValue(b, metric)];
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1;
    } else if (x !== y) {
      return metric === "speed" ? x - y : y - x;
    }
    return b.closes - a.closes || b.booked - a.booked || b.dials - a.dials;
  });
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

const PLACES = [
  {
    medal: "🥇",
    label: "1st place",
    ring: "ring-amber-300",
    avatar: "from-amber-300 to-yellow-500 text-amber-950",
    step: "h-40 from-amber-300/90 to-amber-500/90",
  },
  {
    medal: "🥈",
    label: "2nd place",
    ring: "ring-slate-300",
    avatar: "from-slate-200 to-slate-400 text-slate-900",
    step: "h-28 from-slate-300/90 to-slate-400/90",
  },
  {
    medal: "🥉",
    label: "3rd place",
    ring: "ring-orange-300",
    avatar: "from-orange-300 to-orange-500 text-orange-950",
    step: "h-20 from-orange-300/90 to-orange-500/90",
  },
];

function Avatar({ name, place, size }: { name: string; place?: number; size: "lg" | "sm" }) {
  const style = place !== undefined && place < 3 ? PLACES[place] : null;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-extrabold ${
        style ? `${style.avatar} ring-4 ${style.ring}` : "from-slate-600 to-slate-800 text-white"
      } ${size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-sm"}`}
    >
      {initials(name)}
    </span>
  );
}

function PodiumSpot({
  row,
  place,
  metric,
  me,
}: {
  row: LeaderboardRow | undefined;
  place: number;
  metric: Metric;
  me: string;
}) {
  const style = PLACES[place];
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      {row ? (
        <>
          <span className="text-3xl">{style.medal}</span>
          <div className="mt-1">
            <Avatar name={row.name} place={place} size="lg" />
          </div>
          <p className="mt-2 max-w-full truncate px-1 text-center font-extrabold text-white">
            {row.name}
            {row.actorId === me ? <span className="text-white/60"> (you)</span> : null}
          </p>
          <p className="text-2xl font-extrabold tabular-nums text-white">{showMetric(row, metric)}</p>
          <p className="text-xs text-white/60">{METRICS.find((m) => m.id === metric)!.label.toLowerCase()}</p>
          {metric === "closes" ? (
            <p className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/80">
              {row.monthly} monthly · {row.yearly} yearly
            </p>
          ) : null}
        </>
      ) : (
        <p className="pb-2 text-sm text-white/40">Open spot</p>
      )}
      <div
        className={`mt-3 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-2 text-sm font-extrabold text-black/70 ${style.step}`}
      >
        {style.label}
      </div>
    </div>
  );
}

export default function Leaderboard({
  me,
  onError,
}: {
  me: string;
  onError: (error: unknown) => void;
}) {
  const [range, setRange] = useState<StatRange>("7d");
  const [metric, setMetric] = useState<Metric>("closes");
  const stats = useStats(range, 0, onError);
  const rows = useMemo(() => (stats ? rank(stats.leaderboard, metric) : []), [stats, metric]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker range={range} onChange={setRange} />
      </div>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 pt-6 shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Leaderboard</p>
            <h2 className="mt-1 text-3xl font-extrabold text-white">Who&apos;s on top</h2>
            <p className="text-sm text-white/60">Ranked by {METRICS.find((m) => m.id === metric)!.label.toLowerCase()}, {rangeText(range)}.</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-full bg-white/10 p-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  m.id === metric ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {!stats ? (
          <p className="py-16 text-center text-white/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-white/60">No activity yet for this time frame.</p>
        ) : (
          <div className="mx-auto mt-8 flex max-w-2xl items-end gap-3">
            <PodiumSpot row={rows[1]} place={1} metric={metric} me={me} />
            <PodiumSpot row={rows[0]} place={0} metric={metric} me={me} />
            <PodiumSpot row={rows[2]} place={2} metric={metric} me={me} />
          </div>
        )}
      </section>

      {rows.length > 0 ? (
        <section className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Place</th>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 text-right font-bold">Dials</th>
                <th className="px-4 py-3 text-right font-bold">Answer rate</th>
                <th className="px-4 py-3 text-right font-bold">Booked</th>
                <th className="px-4 py-3 text-right font-bold">Show rate</th>
                <th className="px-4 py-3 text-right font-bold">Monthly</th>
                <th className="px-4 py-3 text-right font-bold">Yearly</th>
                <th className="px-4 py-3 text-right font-bold">Total closes</th>
                <th className="px-4 py-3 text-right font-bold">Close rate</th>
                <th className="px-4 py-3 text-right font-bold">Speed to lead</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.actorId}
                  className={`border-b border-border last:border-0 ${row.actorId === me ? "bg-accent/5" : ""}`}
                >
                  <td className="px-4 py-3 font-extrabold tabular-nums">
                    {i < 3 ? <span className="text-xl">{PLACES[i].medal}</span> : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={row.name} place={i} size="sm" />
                      <span className="font-bold">
                        {row.name}
                        {row.actorId === me ? <span className="font-normal text-muted"> (you)</span> : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.dials}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{percent(row.answerRate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.booked}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {percent(row.showRate)}
                    {row.noShows > 0 ? (
                      <span className="block text-xs text-muted">{row.noShows} no-show{row.noShows === 1 ? "" : "s"}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.monthly}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.yearly}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums">{row.closes}</td>
                  <td className="px-4 py-3 text-right tabular-nums" title={`${row.claimedClosed} closed of ${row.claimed} claimed`}>
                    {percent(row.closeRate)}
                    <span className="block text-xs text-muted">
                      {row.claimedClosed}/{row.claimed} claimed
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.avgSpeedSeconds === null ? "–" : formatDuration(row.avgSpeedSeconds)}
                    {row.speedLeads > 0 ? (
                      <span className="block text-xs text-muted">
                        {row.speedLeads} opt-in{row.speedLeads === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        Dials: calls placed from the CRM. Booked: leads they moved to Appointment scheduled. Closes:
        leads they closed in this time frame (monthly and yearly). Show rate: of the calls they booked that
        already happened, how many weren&apos;t no-shows. Close rate: of the leads they claimed in this time frame, how
        many are closed. Speed to lead: average time from opt-in to their first call, on the
        opt-ins they reached first.
      </p>
    </div>
  );
}
