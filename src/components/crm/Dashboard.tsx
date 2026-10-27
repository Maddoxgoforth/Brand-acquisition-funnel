"use client";

import { useEffect, useState } from "react";

import {
  SOURCES,
  STAT_RANGES,
  formatDuration,
  type FunnelNumbers,
  type OptInChannel,
  type StatRange,
  type Stats,
} from "@/lib/crm/constants";
import { crmFetch } from "./api";

function percent(value: number | null) {
  return value === null ? "–" : `${(value * 100).toFixed(1)}%`;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

function FunnelCards({
  n,
  closedDetail,
  conversionDetail,
}: {
  n: FunnelNumbers;
  closedDetail: string;
  conversionDetail: string;
}) {
  return (
    <>
      <StatCard label="Dialed" value={String(n.dialed)} detail="Called or moved out of To dial" />
      <StatCard
        label="Answer rate"
        value={percent(n.answerRate)}
        detail={`${n.answered} picked up out of ${n.dialed} dialed`}
      />
      <StatCard label="Closed" value={String(n.closed)} detail={closedDetail} />
      <StatCard label="Conversion rate" value={percent(n.conversionRate)} detail={conversionDetail} />
    </>
  );
}

// `refreshKey` changes when a new opt-in arrives, to reload the numbers.
export default function Dashboard({
  refreshKey,
  onError,
}: {
  refreshKey: number;
  onError: (error: unknown) => void;
}) {
  const [range, setRange] = useState<StatRange>("30d");
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

  const label = STAT_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === "all" ? "all time" : `the past ${label.toLowerCase()}`;
  const current = stats?.range === range ? stats : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background p-1">
        {STAT_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              r.id === range ? "bg-accent text-white" : "text-muted hover:bg-background-elevated hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!current ? <p className="text-muted">Loading dashboard…</p> : null}

      {current?.optIns ? (
        <section>
          <h2 className="text-lg font-extrabold">Free course opt-ins: ads vs organic</h2>
          <p className="text-sm text-muted">
            Opt-ins that came in during {inRange}, and what has happened to them since. Visitors are unique
            people who landed on each funnel&apos;s first page (counted since page tracking went live).
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Opt-ins"
              value={String(current.optIns.total.total)}
              detail={current.optIns.channels.map((c) => `${c.label}: ${c.total}`).join(" · ")}
            />
            <StatCard
              label="Opt-in rate"
              value={percent(current.optIns.total.optInRate)}
              detail={
                current.optIns.total.visitors === null
                  ? "No page visits tracked yet"
                  : `Of ${current.optIns.total.visitors} tracked visitors`
              }
            />
            <StatCard
              label="Booked a call"
              value={percent(current.optIns.total.bookRate)}
              detail={`${current.optIns.total.booked} of ${current.optIns.total.total} opt-ins`}
            />
            <StatCard
              label="Closed"
              value={percent(current.optIns.total.conversionRate)}
              detail={`${current.optIns.total.closed} of ${current.optIns.total.total} opt-ins`}
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-3 font-bold">Traffic</th>
                  <th className="px-5 py-3 text-right font-bold">Visitors</th>
                  <th className="px-5 py-3 text-right font-bold">Opt-ins</th>
                  <th className="px-5 py-3 text-right font-bold">Opt-in rate</th>
                  <th className="px-5 py-3 text-right font-bold">Answer rate</th>
                  <th className="px-5 py-3 text-right font-bold">Booked</th>
                  <th className="px-5 py-3 text-right font-bold">Book rate</th>
                  <th className="px-5 py-3 text-right font-bold">Closed</th>
                  <th className="px-5 py-3 text-right font-bold">Close rate</th>
                  <th className="px-5 py-3 text-right font-bold">Avg first call</th>
                  <th className="px-5 py-3 text-right font-bold">≤ 5 min</th>
                </tr>
              </thead>
              <tbody>
                {[...current.optIns.channels, current.optIns.total].map((c: OptInChannel, i, all) => (
                  <tr
                    key={c.label}
                    className={`border-b border-border last:border-0 ${i === all.length - 1 ? "font-bold" : ""}`}
                  >
                    <td className="px-5 py-3 font-semibold">{c.label}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.visitors ?? "–"}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.total}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(c.optInRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(c.answerRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.booked}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(c.bookRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.closed}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(c.conversionRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {c.avgFirstContactSeconds === null ? "–" : formatDuration(c.avgFirstContactSeconds)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {percent(c.total > 0 ? c.within5 / c.total : null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Avg time to first call"
              value={
                current.optIns.total.avgFirstContactSeconds === null
                  ? "–"
                  : formatDuration(current.optIns.total.avgFirstContactSeconds)
              }
              detail="All opt-ins, organic and ads"
            />
            <StatCard
              label="Called within 5 min"
              value={percent(
                current.optIns.total.total > 0
                  ? current.optIns.total.within5 / current.optIns.total.total
                  : null
              )}
              detail={`${current.optIns.total.within5} of ${current.optIns.total.total} opt-ins`}
            />
            <StatCard
              label="Still waiting"
              value={String(current.optIns.total.waiting)}
              detail="Opt-ins nobody has called yet"
            />
          </div>
        </section>
      ) : null}

      {current?.adFunnel ? (
        <section>
          <h2 className="text-lg font-extrabold">Ad funnel drop-off</h2>
          <p className="text-sm text-muted">
            Unique visitors who reached each step of /free-training during {inRange}.
          </p>
          <div className="mt-3 space-y-2 rounded-2xl border border-border bg-background p-5">
            {current.adFunnel.map((s) => {
              const top = current.adFunnel![0].visitors;
              const share = top > 0 ? s.visitors / top : 0;
              return (
                <div key={s.step} className="grid grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-semibold">{s.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-background-elevated">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(share * 100, s.visitors ? 2 : 0)}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums">
                    {s.visitors} <span className="text-muted">({top > 0 ? `${Math.round(share * 100)}%` : "–"})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {current?.campaigns && current.campaigns.length > 0 ? (
        <section>
          <h2 className="text-lg font-extrabold">Ad opt-ins by platform and campaign</h2>
          <p className="text-sm text-muted">
            From the ad links&apos; utm_source, utm_campaign and utm_content tags, for opt-ins during {inRange}.
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-3 font-bold">Platform</th>
                  <th className="px-5 py-3 font-bold">Campaign</th>
                  <th className="px-5 py-3 font-bold">Ad</th>
                  <th className="px-5 py-3 text-right font-bold">Opt-ins</th>
                  <th className="px-5 py-3 text-right font-bold">Booked</th>
                  <th className="px-5 py-3 text-right font-bold">Closed</th>
                  <th className="px-5 py-3 text-right font-bold">Book rate</th>
                </tr>
              </thead>
              <tbody>
                {current.campaigns.map((r) => (
                  <tr key={`${r.source}|${r.campaign}|${r.ad}`} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 capitalize">{r.source}</td>
                    <td className="px-5 py-3 font-semibold">{r.campaign}</td>
                    <td className="px-5 py-3">{r.ad}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.optIns}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.booked}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.closed}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {percent(r.optIns > 0 ? r.booked / r.optIns : null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {current ? (
        <section>
          <h2 className="text-lg font-extrabold">Team leaderboard</h2>
          <p className="text-sm text-muted">
            Calls placed and closes made by each person during {inRange}.
          </p>
          {current.leaderboard.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
              No calls or closes logged yet for this time frame.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold">#</th>
                    <th className="px-5 py-3 font-bold">Name</th>
                    <th className="px-5 py-3 text-right font-bold">Dials</th>
                    <th className="px-5 py-3 text-right font-bold">Leads called</th>
                    <th className="px-5 py-3 text-right font-bold">Answered</th>
                    <th className="px-5 py-3 text-right font-bold">Answer rate</th>
                    <th className="px-5 py-3 text-right font-bold">Closes</th>
                  </tr>
                </thead>
                <tbody>
                  {current.leaderboard.map((row, i) => (
                    <tr key={row.actorId} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-bold tabular-nums">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold">{row.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{row.dials}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{row.leadsCalled}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{row.answered}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{percent(row.answerRate)}</td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">{row.closes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {current?.dial ? (
        <section>
          <h2 className="text-lg font-extrabold">Leads to dial</h2>
          <p className="text-sm text-muted">
            Calling activity on your past leads during {inRange}. {current.dial.leadsInLists} leads
            in the lists, {current.dial.toDial} not called yet.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FunnelCards
              n={current.dial}
              closedDetail={`Moved to Closed in ${inRange}`}
              conversionDetail={`${current.dial.closed} closed out of ${current.dial.dialed} dialed`}
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-5 py-3 font-bold">List</th>
                  <th className="px-5 py-3 text-right font-bold">Leads</th>
                  <th className="px-5 py-3 text-right font-bold">To dial</th>
                  <th className="px-5 py-3 text-right font-bold">Dialed</th>
                  <th className="px-5 py-3 text-right font-bold">Answered</th>
                  <th className="px-5 py-3 text-right font-bold">Closed</th>
                  <th className="px-5 py-3 text-right font-bold">Answer rate</th>
                  <th className="px-5 py-3 text-right font-bold">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {current.dial.bySource.map((row) => (
                  <tr key={row.source} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-semibold">
                      {SOURCES.find((s) => s.id === row.source)?.label}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.total}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.toDial}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.dialed}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.answered}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.closed}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(row.answerRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{percent(row.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
