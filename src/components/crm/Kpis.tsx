"use client";

import { useCallback, useEffect, useState } from "react";

import { crmFetch } from "./api";

// Closer KPIs and strikes (owner, Nov 24 2026). GET/POST /api/crm/kpis.
type Strike = {
  id: string;
  kind: "dials" | "plan_mix" | "manual";
  reason: string;
  createdAt: string;
  expiresAt: string;
  removedAt: string | null;
  removedBy: string | null;
  active: boolean;
};
type Person = {
  userId: string;
  name: string;
  dialsToday: number;
  dialsYesterday: number | null;
  weekDays: { date: string; dials: number; workday: boolean; future: boolean }[];
  mix: { yearly: number; closes: number; share: number | null };
  activeStrikes: number;
  strikes: Strike[];
};
type Report = {
  rules: { start: string; dialsPerDay: number; yearlyShare: number; mixWindow: number; strikeDays: number; strikesToFire: number };
  today: string;
  people: Person[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
const KIND = { dials: "Dials", plan_mix: "Plan mix", manual: "Added by owner" } as const;

export default function Kpis({ isOwner, onError }: { isOwner: boolean; onError: (e: unknown) => void }) {
  const [data, setData] = useState<Report | null>(null);
  const [showOld, setShowOld] = useState(false);

  const load = useCallback(() => {
    crmFetch<Report>("/api/crm/kpis").then(setData).catch(onError);
  }, [onError]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(body: Record<string, string>) {
    try {
      await crmFetch("/api/crm/kpis", { method: "POST", body });
      load();
    } catch (e) {
      onError(e);
    }
  }

  if (!data) return <p className="p-8 text-sm text-muted">Loading…</p>;
  const r = data.rules;
  const started = data.today >= r.start;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">🎯 KPIs</h1>
        <p className="text-sm text-muted">
          Miss a KPI and you get a strike. Strikes expire after {r.strikeDays} days.{" "}
          <strong className="text-foreground">{r.strikesToFire} active strikes = fired.</strong>
          {!started ? ` Starts ${day(`${r.start}T12:00:00Z`)}.` : ""}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Daily</p>
          <p className="mt-1 text-lg font-extrabold">{r.dialsPerDay} different people dialed every day</p>
          <p className="text-sm text-muted">Every day including weekends, Eastern time. Calling the same person twice counts once; answered or not doesn&apos;t matter.</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Plan mix</p>
          <p className="mt-1 text-lg font-extrabold">
            {Math.round(r.yearlyShare * 100)}% yearly / {100 - Math.round(r.yearlyShare * 100)}% monthly
          </p>
          <p className="text-sm text-muted">
            Over your last {r.mixWindow} closes, checked at the end of each week you close something.
          </p>
        </div>
      </div>

      {data.people.length === 0 ? (
        <p className="text-sm text-muted">No closers with dial access yet.</p>
      ) : null}

      {data.people.map((p) => {
        const fired = p.activeStrikes >= r.strikesToFire;
        const pct = Math.min(100, Math.round((p.dialsToday / r.dialsPerDay) * 100));
        const mixPct = p.mix.share === null ? null : Math.round(p.mix.share * 100);
        const strikes = p.strikes.filter((s) => showOld || s.active);
        return (
          <section
            key={p.userId}
            className={`rounded-2xl border p-5 ${fired ? "border-danger bg-danger/5" : "border-border bg-background"}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-extrabold">{p.name || "Team member"}</h2>
              <span className="flex gap-1" title={`${p.activeStrikes} active strike${p.activeStrikes === 1 ? "" : "s"}`}>
                {Array.from({ length: r.strikesToFire }, (_, i) => (
                  <span
                    key={i}
                    className={`h-4 w-4 rounded-full ${i < p.activeStrikes ? "bg-danger" : "bg-border"}`}
                  />
                ))}
              </span>
              <span className={`text-sm font-bold ${p.activeStrikes ? "text-danger" : "text-muted"}`}>
                {p.activeStrikes}/{r.strikesToFire} strikes
              </span>
              {fired ? (
                <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold text-white">
                  {r.strikesToFire} strikes — fired
                </span>
              ) : p.activeStrikes === r.strikesToFire - 1 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Final warning
                </span>
              ) : null}
              {isOwner ? (
                <button
                  type="button"
                  className="ml-auto text-sm font-bold text-muted hover:text-danger"
                  onClick={() => {
                    const reason = window.prompt(`Reason for giving ${p.name} a strike:`);
                    if (reason?.trim()) act({ action: "add", userId: p.userId, reason });
                  }}
                >
                  + Add strike
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Dials today</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {p.dialsToday}
                  <span className="text-base text-muted"> / {r.dialsPerDay}</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {p.dialsYesterday !== null ? (
                  <p className="mt-1 text-xs text-muted">Yesterday: {p.dialsYesterday}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">This week</p>
                <div className="mt-2 flex gap-1">
                  {p.weekDays.map((d) => {
                    const hit = d.dials >= r.dialsPerDay;
                    const missed = d.workday && !d.future && d.date < data.today && !hit && d.date >= r.start;
                    return (
                      <div
                        key={d.date}
                        title={`${weekday(d.date)}: ${d.dials} dials`}
                        className={`flex w-10 flex-col items-center rounded-lg py-1 text-xs ${
                          d.future
                            ? "bg-background-elevated text-muted"
                            : hit
                              ? "bg-emerald-100 text-emerald-800"
                              : missed
                                ? "bg-danger/15 text-danger"
                                : "bg-background-elevated"
                        }`}
                      >
                        <span className="font-bold">{weekday(d.date).slice(0, 2)}</span>
                        <span>{d.future ? "–" : d.dials}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Yearly mix</p>
                <p
                  className={`mt-1 text-2xl font-extrabold ${
                    mixPct === null ? "" : mixPct >= r.yearlyShare * 100 ? "text-emerald-600" : "text-danger"
                  }`}
                >
                  {mixPct === null ? "–" : `${mixPct}%`}
                </p>
                <p className="text-xs text-muted">
                  {p.mix.closes
                    ? `${p.mix.yearly} yearly of last ${p.mix.closes} close${p.mix.closes === 1 ? "" : "s"}`
                    : "No closes yet"}
                  {p.mix.closes > 0 && p.mix.closes < r.mixWindow ? ` (counts from ${r.mixWindow})` : ""}
                </p>
              </div>
            </div>

            {strikes.length ? (
              <ul className="mt-4 space-y-1 border-t border-border pt-3">
                {strikes.map((s) => (
                  <li key={s.id} className={`flex flex-wrap items-center gap-2 text-sm ${s.active ? "" : "text-muted line-through"}`}>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.active ? "bg-danger/15 text-danger" : "bg-border"}`}>
                      {KIND[s.kind]}
                    </span>
                    <span>{s.reason}</span>
                    <span className="text-xs text-muted no-underline">
                      {day(s.createdAt)}
                      {s.removedAt
                        ? ` · removed by ${s.removedBy ?? "owner"}`
                        : s.active
                          ? ` · expires ${day(s.expiresAt)}`
                          : " · expired"}
                    </span>
                    {isOwner && (s.active || s.removedAt) ? (
                      <button
                        type="button"
                        className="ml-auto text-xs font-bold text-muted hover:text-foreground"
                        onClick={() => act({ action: s.removedAt ? "restore" : "remove", id: s.id })}
                      >
                        {s.removedAt ? "Restore" : "Remove (excused)"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">No active strikes.</p>
            )}
          </section>
        );
      })}

      {data.people.some((p) => p.strikes.some((s) => !s.active)) ? (
        <button type="button" className="text-sm font-bold text-muted hover:text-foreground" onClick={() => setShowOld((v) => !v)}>
          {showOld ? "Hide expired and removed strikes" : "Show expired and removed strikes"}
        </button>
      ) : null}
    </div>
  );
}
