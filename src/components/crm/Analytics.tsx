"use client";

import { useState } from "react";

import {
  CLOSE_PLANS,
  SOURCES,
  formatDuration,
  type CloseSplit,
  type FunnelNumbers,
  type OptInChannel,
  type StatRange,
} from "@/lib/crm/constants";
import { splitText } from "./Dashboard";
import { RangePicker, StatCard, percent, rangeText, useStats } from "./statsUi";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const PRICE = Object.fromEntries(CLOSE_PLANS.map((p) => [p.id, p.amount])) as Record<"monthly" | "yearly", number>;

function SplitCells({ c, amount }: { c: CloseSplit; amount: number }) {
  return (
    <>
      <td className="px-5 py-3 text-right tabular-nums">{c.monthly}</td>
      <td className="px-5 py-3 text-right tabular-nums">{c.yearly}</td>
      <td className="px-5 py-3 text-right font-bold tabular-nums">{c.total}</td>
      <td className="px-5 py-3 text-right font-extrabold tabular-nums text-emerald-700">{money(amount)}</td>
    </>
  );
}

const splitHead = (
  <>
    <th className="px-5 py-3 text-right font-bold">Monthly</th>
    <th className="px-5 py-3 text-right font-bold">Yearly</th>
    <th className="px-5 py-3 text-right font-bold">Total closes</th>
    <th className="px-5 py-3 text-right font-bold">Cash collected</th>
  </>
);

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

// The owner's Analytics tab: every number on the funnels, ads and lists.
// `refreshKey` changes when a new opt-in arrives, to reload the numbers.
export default function Analytics({
  refreshKey,
  onError,
}: {
  refreshKey: number;
  onError: (error: unknown) => void;
}) {
  const [range, setRange] = useState<StatRange>("30d");
  const current = useStats(range, refreshKey, onError);
  const inRange = rangeText(range);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <RangePicker range={range} onChange={setRange} />

      {!current ? <p className="text-muted">Loading analytics…</p> : null}

      {current?.revenue ? (
        <section>
          <h2 className="text-lg font-extrabold">💰 Cash collected</h2>
          <p className="text-sm text-muted">
            What your closes made you during {inRange}: {money(PRICE.monthly)} per monthly close,{" "}
            {money(PRICE.yearly)} per yearly close.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              highlight
              label="Total cash collected"
              value={money(current.revenue.total)}
              detail={`From ${current.revenue.closes.total} closes`}
            />
            <StatCard
              label="Monthly closes"
              value={String(current.revenue.closes.monthly)}
              detail={`${current.revenue.closes.monthly} × ${money(PRICE.monthly)} = ${money(current.revenue.monthlyAmount)}`}
            />
            <StatCard
              label="Yearly closes"
              value={String(current.revenue.closes.yearly)}
              detail={`${current.revenue.closes.yearly} × ${money(PRICE.yearly)} = ${money(current.revenue.yearlyAmount)}`}
            />
            <StatCard
              label="Avg per close"
              value={
                current.revenue.closes.total - current.revenue.closes.unknown > 0
                  ? money(Math.round(current.revenue.total / (current.revenue.closes.total - current.revenue.closes.unknown)))
                  : "–"
              }
              detail={
                current.revenue.closes.unknown > 0
                  ? `${current.revenue.closes.unknown} older close${current.revenue.closes.unknown === 1 ? "" : "s"} have no plan recorded`
                  : "Across monthly and yearly"
              }
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold">Closer</th>
                    {splitHead}
                  </tr>
                </thead>
                <tbody>
                  {current.revenue.byCloser.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 text-muted">No closes in this time frame yet.</td>
                    </tr>
                  ) : (
                    current.revenue.byCloser.map((r) => (
                      <tr key={r.name} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-semibold">{r.name}</td>
                        <SplitCells c={r.closes} amount={r.amount} />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold">Lead list</th>
                    {splitHead}
                  </tr>
                </thead>
                <tbody>
                  {current.revenue.bySource.map((r) => (
                    <tr key={r.source} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-semibold">{r.label}</td>
                      <SplitCells c={r.closes} amount={r.amount} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {current ? (
        <section>
          <h2 className="text-lg font-extrabold">Sales calls</h2>
          <p className="text-sm text-muted">Booked calls and how they went, {inRange}.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Booked appointments" value={String(current.team.booked)} detail={`${percent(current.team.bookRate)} of leads who picked up`} />
            <StatCard
              label="Show rate"
              value={percent(current.team.showRate)}
              detail={`${current.team.noShows} no-show${current.team.noShows === 1 ? "" : "s"}`}
            />
            <StatCard label="Closes" value={String(current.team.closes.total)} detail={splitText(current.team.closes)} />
            <StatCard
              label="Close rate"
              value={percent(current.team.closeRate)}
              detail={`${current.team.closes.total} closes from ${current.team.talked} leads you talked to`}
            />
            <StatCard
              label="Closed on a booked call"
              value={String(current.team.closesFromBooked)}
              detail={`${percent(current.team.bookedCloseRate)} of booked calls that happened`}
            />
            <StatCard
              label="Closed without booking"
              value={String(current.team.closesDirect)}
              detail="Closed straight away, e.g. on the first call"
            />
          </div>
        </section>
      ) : null}

      {current?.optIns ? (
        <section>
          <h2 className="text-lg font-extrabold">Speed to lead</h2>
          <p className="text-sm text-muted">
            How fast the team calls free course opt-ins (organic and ads) that came in during {inRange}.
            The goal is under 5 minutes.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              highlight
              label="Avg speed to lead"
              value={
                current.optIns.total.avgFirstContactSeconds === null
                  ? "–"
                  : formatDuration(current.optIns.total.avgFirstContactSeconds)
              }
              detail={`Across ${current.optIns.total.contacted} called opt-ins`}
            />
            <StatCard
              label="Median"
              value={
                current.optIns.total.medianFirstContactSeconds === null
                  ? "–"
                  : formatDuration(current.optIns.total.medianFirstContactSeconds)
              }
              detail="Half of opt-ins were called faster than this"
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
                  <th className="px-5 py-3 text-right font-bold">Cash collected</th>
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
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-emerald-700">{money(r.revenue)}</td>
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
