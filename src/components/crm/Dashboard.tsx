"use client";

import { useEffect, useState } from "react";

import {
  SOURCES,
  formatAppointment,
  formatDuration,
  type CloseSplit,
  type Lead,
  type StatRange,
} from "@/lib/crm/constants";
import { RangePicker, StatCard, percent, rangeText, useStats } from "./statsUi";

const duration = (s: number | null) => (s === null ? "–" : formatDuration(s));

// "3 monthly · 2 yearly" (+ closes from before plans were recorded)
export function splitText(c: CloseSplit) {
  const parts = [`${c.monthly} monthly`, `${c.yearly} yearly`];
  if (c.unknown > 0) parts.push(`${c.unknown} no plan`);
  return parts.join(" · ");
}

// Callbacks due today (in this browser's time zone) or overdue.
function CallbacksDue({
  callbacks,
  me,
  onOpenLead,
}: {
  callbacks: Lead[];
  me: string;
  onOpenLead: (lead: Lead) => void;
}) {
  // Ticks every minute so "overdue" stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const due = callbacks.filter((l) => l.appointmentAt && new Date(l.appointmentAt) <= endOfToday);
  return (
    <section>
      <h2 className="text-lg font-extrabold">📞 Callbacks due today</h2>
      <p className="text-sm text-muted">Leads that asked to be called back today, plus any that are overdue.</p>
      {due.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
          No callbacks due today. 🎉
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {due.map((lead) => {
            const late = new Date(lead.appointmentAt!).getTime() < now;
            const mine = lead.claimedById === me;
            return (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => onOpenLead(lead)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-background-elevated"
                >
                  <span
                    className={`w-52 shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
                      late ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-800"
                    }`}
                  >
                    {late ? "Overdue · " : ""}
                    {formatAppointment(lead.appointmentAt!, lead.appointmentTz)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{lead.name || "No name"}</span>
                    <span className="block truncate text-xs text-muted">
                      {SOURCES.find((s) => s.id === lead.source)?.label}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${mine ? "text-accent" : "text-muted"}`}>
                    {lead.claimedById ? (mine ? "Yours" : lead.claimedByName) : "Unclaimed"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// The Dashboard everyone on the team sees: the team's key numbers and their
// own. The owner's full numbers live in the Analytics tab.
export default function Dashboard({
  me,
  refreshKey,
  onError,
  onOpenLead,
}: {
  me: string;
  onOpenLead: (lead: Lead) => void;
  refreshKey: number;
  onError: (error: unknown) => void;
}) {
  const [range, setRange] = useState<StatRange>("7d");
  const stats = useStats(range, refreshKey, onError);
  const inRange = rangeText(range);

  if (!stats) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <RangePicker range={range} onChange={setRange} />
        <p className="text-muted">Loading dashboard…</p>
      </div>
    );
  }

  const t = stats.team;
  const place = stats.leaderboard.findIndex((r) => r.actorId === me);
  const mine = place >= 0 ? stats.leaderboard[place] : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <RangePicker range={range} onChange={setRange} />

      <CallbacksDue callbacks={stats.callbacks} me={me} onOpenLead={onOpenLead} />

      <section>
        <h2 className="text-lg font-extrabold">Team</h2>
        <p className="text-sm text-muted">Everyone&apos;s numbers combined, {inRange}.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.optIns !== null ? (
            <StatCard label="Opt-ins" value={String(t.optIns)} detail="New free course opt-ins" />
          ) : null}
          <StatCard label="Dials" value={String(t.dials)} detail={`${t.leadsCalled} different leads called`} />
          <StatCard
            label="Answer rate"
            value={percent(t.answerRate)}
            detail={`${t.answered} of ${t.leadsCalled} called leads picked up`}
          />
          <StatCard
            label="Booked appointments"
            value={String(t.booked)}
            detail={`${percent(t.bookRate)} of leads who picked up`}
          />
          <StatCard
            label="Show rate"
            value={percent(t.showRate)}
            detail={`${t.noShows} no-show${t.noShows === 1 ? "" : "s"} on booked calls`}
          />
          <StatCard label="Closes" value={String(t.closes.total)} detail={splitText(t.closes)} />
          <StatCard
            label="Close rate"
            value={percent(t.closeRate)}
            detail={`${t.closes.total} closes from ${t.booked} booked appointments`}
          />
          {t.optIns !== null ? (
            <>
              <StatCard
                label="Avg speed to lead"
                value={duration(t.avgFirstContactSeconds)}
                detail={`${percent(t.within5Rate)} called within 5 minutes`}
              />
              <StatCard
                label="Waiting for a call"
                value={String(t.waiting ?? 0)}
                detail="Opt-ins nobody has called yet"
              />
            </>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">You</h2>
        <p className="text-sm text-muted">
          {mine && place >= 0
            ? `You're #${place + 1} of ${stats.leaderboard.length} on the leaderboard, ${inRange}.`
            : `Your numbers, ${inRange}.`}
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard highlight label="Your dials" value={String(mine?.dials ?? 0)} detail={`${percent(mine?.answerRate ?? null)} answer rate`} />
          <StatCard
            highlight
            label="Booked"
            value={String(mine?.booked ?? 0)}
            detail={`${percent(mine?.showRate ?? null)} show rate`}
          />
          <StatCard
            highlight
            label="Closes"
            value={String(mine?.closes ?? 0)}
            detail={`${mine?.monthly ?? 0} monthly · ${mine?.yearly ?? 0} yearly`}
          />
          <StatCard
            highlight
            label="Close rate"
            value={percent(mine?.closeRate ?? null)}
            detail={`${mine?.claimedClosed ?? 0} closed of ${mine?.claimed ?? 0} you claimed`}
          />
          <StatCard
            highlight
            label="Speed to lead"
            value={duration(mine?.avgSpeedSeconds ?? null)}
            detail={`Avg on ${mine?.speedLeads ?? 0} opt-ins you called first`}
          />
        </div>
      </section>
    </div>
  );
}
