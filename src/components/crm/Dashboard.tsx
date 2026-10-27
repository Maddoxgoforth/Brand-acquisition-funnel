"use client";

import { useState } from "react";

import { formatDuration, type StatRange } from "@/lib/crm/constants";
import { RangePicker, StatCard, percent, rangeText, useStats } from "./statsUi";

const duration = (s: number | null) => (s === null ? "–" : formatDuration(s));

// The Dashboard everyone on the team sees: the team's key numbers and their
// own. The owner's full numbers live in the Analytics tab.
export default function Dashboard({
  me,
  refreshKey,
  onError,
}: {
  me: string;
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
          <StatCard label="Closes" value={String(t.closes)} detail="Leads moved to Closed" />
          <StatCard
            label="Close rate"
            value={percent(t.closeRate)}
            detail={`${t.closes} closes from ${t.booked} booked appointments`}
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
          <StatCard highlight label="Booked" value={String(mine?.booked ?? 0)} detail="Appointments you set" />
          <StatCard highlight label="Closes" value={String(mine?.closes ?? 0)} detail="Leads you closed" />
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
