"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PAY_PLANS,
  SOURCES,
  STATUSES,
  payPlanNoun,
  type ActivityItem,
  type PayLine,
  type PayMemberRow,
  type PayPlan,
  type PayReport,
} from "@/lib/crm/constants";
import { crmFetch, timeAgo } from "./api";
import { StatCard } from "./statsUi";

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// ---- Time frame (presets + custom dates) -----------------------------------

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "1d", label: "1 day", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "3 months", days: 90 },
  { id: "365d", label: "1 year", days: 365 },
  { id: "all", label: "Lifetime" },
  { id: "custom", label: "Custom" },
] as const;
type Preset = (typeof PRESETS)[number]["id"];

const dateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// The time frame as ISO times (local days for Today / Custom).
function rangeOf(preset: Preset, from: string, to: string): { from: string | null; to: string | null; text: string } {
  if (preset === "all") return { from: null, to: null, text: "all time" };
  if (preset === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: null, text: "today" };
  }
  if (preset === "custom") {
    const a = from ? new Date(`${from}T00:00:00`) : null;
    const b = to ? new Date(`${to}T00:00:00`) : null;
    if (b) b.setDate(b.getDate() + 1);
    const fmt = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      from: a ? a.toISOString() : null,
      to: b ? b.toISOString() : null,
      text: from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `since ${fmt(from)}` : to ? `up to ${fmt(to)}` : "all time",
    };
  }
  const p = PRESETS.find((x) => x.id === preset)!;
  const days = "days" in p ? p.days : 0;
  return { from: new Date(Date.now() - days * 86400_000).toISOString(), to: null, text: `the past ${p.label}` };
}

const query = (r: { from: string | null; to: string | null }) =>
  [r.from ? `from=${encodeURIComponent(r.from)}` : "", r.to ? `to=${encodeURIComponent(r.to)}` : ""].filter(Boolean).join("&");

// ---- Activity feed -----------------------------------------------------------

const statusLabel = (id: string) => STATUSES.find((s) => s.id === id)?.label ?? id;

function describe(a: ActivityItem): { icon: string; text: string } {
  const d = a.data;
  switch (a.type) {
    case "call":
      return { icon: "📞", text: `Called ${a.leadName}${d.notes ? ` · note: "${d.notes}"` : ""}` };
    case "status":
      return d.to === "closed"
        ? { icon: "💰", text: `Closed ${a.leadName}${d.plan ? ` (${d.plan})` : ""}` }
        : { icon: "➡️", text: `Moved ${a.leadName}: ${statusLabel(d.from)} → ${statusLabel(d.to)}` };
    case "appointment":
      return {
        icon: "📅",
        text: d.at
          ? `Set ${d.kind === "callback" ? "a callback" : "an appointment"} with ${a.leadName} for ${when(d.at)}`
          : `Cleared the time for ${a.leadName}`,
      };
    case "claim":
      return { icon: "✋", text: `${d.action ? d.action[0].toUpperCase() + d.action.slice(1) : "Claimed"} ${a.leadName}${d.from ? ` (from ${d.from})` : ""}` };
    case "close":
      return { icon: "💰", text: `Updated the close on ${a.leadName}${d.plan ? ` (${d.plan})` : ""}` };
    case "created":
      return { icon: "➕", text: `Added ${a.leadName}` };
    default:
      return { icon: "•", text: `${a.type} · ${a.leadName}` };
  }
}

function Activity({ member, range, onError }: { member: PayMemberRow; range: { from: string | null; to: string | null }; onError: (e: unknown) => void }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [filter, setFilter] = useState<"all" | "call" | "status" | "claim">("all");
  useEffect(() => {
    let cancelled = false;
    const q = query(range);
    crmFetch<{ items: ActivityItem[] }>(`/api/crm/activity?member=${member.userId}${q ? `&${q}` : ""}`)
      .then((d) => !cancelled && setItems(d.items))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [member.userId, range, onError]);

  const shown = items?.filter((i) => filter === "all" || i.type === filter || (filter === "status" && i.type === "appointment"));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold">What {member.name} did</p>
        <div className="flex gap-1 rounded-full border border-border p-1 text-xs font-bold">
          {(
            [
              ["all", "Everything"],
              ["call", "Calls"],
              ["status", "Moves"],
              ["claim", "Claims"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 ${filter === id ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!shown ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing in this time frame.</p>
      ) : (
        <ul className="mt-2 max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background">
          {shown.map((a) => {
            const { icon, text } = describe(a);
            return (
              <li key={a.id} className="flex gap-3 px-4 py-2 text-sm">
                <span className="w-5 shrink-0 text-center">{icon}</span>
                <span className="min-w-0 flex-1">
                  {text}
                  <span className="block text-xs text-muted">{SOURCES.find((s) => s.id === a.source)?.label}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{when(a.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {items && items.length >= 500 ? <p className="mt-1 text-xs text-muted">Showing the latest 500. Pick a shorter time frame to see older ones.</p> : null}
    </div>
  );
}

// ---- Commission lines + manual entries --------------------------------------

const KIND = {
  close: { label: "Close", style: "bg-sky-50 text-sky-800" },
  bounty: { label: "Bounty", style: "bg-amber-50 text-amber-800" },
  bonus: { label: "Bonus", style: "bg-violet-50 text-violet-800" },
  adjustment: { label: "Adjustment", style: "bg-slate-100 text-slate-700" },
  payout: { label: "Paid out", style: "bg-emerald-50 text-emerald-800" },
} as const;

function Lines({
  member,
  lines,
  onPost,
}: {
  member: PayMemberRow;
  lines: PayLine[];
  onPost: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<"payout" | "adjustment">("payout");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => dateInput(new Date()));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onPost({
      action: "entry",
      userId: member.userId,
      kind,
      amount: Number(amount),
      note,
      at: date ? new Date(`${date}T12:00:00`).toISOString() : null,
    });
    if (ok) {
      setAmount("");
      setNote("");
    }
  }

  return (
    <div>
      <p className="font-extrabold">Commission lines</p>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No commission in this time frame.</p>
      ) : (
        <ul className="mt-2 max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background">
          {lines.map((l, i) => (
            <li key={`${l.kind}-${l.leadId ?? l.entryId}-${i}`} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className={`w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-bold ${KIND[l.kind].style}`}>{KIND[l.kind].label}</span>
              <span className="min-w-0 flex-1">
                {l.label}
                <span className="block text-xs text-muted">{when(l.at)}</span>
              </span>
              <span className={`shrink-0 font-extrabold tabular-nums ${l.kind === "payout" ? "text-emerald-700" : ""}`}>
                {l.kind === "payout" ? `paid ${money(l.amount)}` : money(l.amount)}
              </span>
              {l.entryId ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-bold text-danger hover:underline"
                  onClick={() => window.confirm("Remove this line?") && void onPost({ action: "entry-delete", id: l.entryId })}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as "payout" | "adjustment")}>
          <option value="payout">Record a payout</option>
          <option value="adjustment">Add an adjustment (+ or −)</option>
        </select>
        <input className={`${input} w-28`} type="number" placeholder="$" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <input className={`${input} w-40`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className={`${input} min-w-40 flex-1`} placeholder={kind === "payout" ? "e.g. Zelle, week of Nov 9" : "e.g. refund, spiff, correction"} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim">
          Add
        </button>
      </form>
    </div>
  );
}

// ---- Bonus rules ---------------------------------------------------------------

function BonusRules({ report, onPost }: { report: PayReport; onPost: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState("Every 5 yearly closes");
  const [plan, setPlan] = useState<PayPlan>("yearly");
  const [everyN, setEveryN] = useState("5");
  const [amount, setAmount] = useState("50");
  const [open, setOpen] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await onPost({ action: "rule", name, plan, everyN: Number(everyN), amount: Number(amount) })) setOpen(false);
  }

  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Bonus rules</h2>
          <p className="text-sm text-muted">
            Extra commission for hitting a number of closes, e.g. +$50 for every 5 yearly closes. Each rule counts closes from the
            day it&apos;s turned on. To change an amount, turn the old rule off and add a new one, so past bonuses stay as they were.
          </p>
        </div>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim">
            + New bonus rule
          </button>
        ) : null}
      </div>
      {open ? (
        <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm font-semibold">
          <label>
            Name
            <input className={`${input} block w-56`} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Every
            <input className={`${input} block w-20`} type="number" min={1} value={everyN} onChange={(e) => setEveryN(e.target.value)} required />
          </label>
          <label>
            Closes of
            <select className={`${input} block`} value={plan} onChange={(e) => setPlan(e.target.value as PayPlan)}>
              {PAY_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pays extra ($)
            <input className={`${input} block w-24`} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <button type="submit" className="rounded-full bg-accent px-4 py-2 font-bold text-white hover:bg-accent-dim">
            Turn on
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-2 py-2 font-bold text-muted">
            Cancel
          </button>
        </form>
      ) : null}
      {report.rules.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-background p-5 text-sm text-muted">No bonus rules yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-background">
          {report.rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-bold">{r.name}</span>
                <span className="block text-muted">
                  +{money(r.amount)} for every {r.everyN} {payPlanNoun(r.plan)}
                  {r.everyN === 1 ? "" : "s"} · on since {day(r.startsAt)}
                  {r.endedAt ? `, off since ${day(r.endedAt)}` : ""}
                </span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.endedAt ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
                {r.endedAt ? "Off" : "On"}
              </span>
              <button
                type="button"
                className="text-xs font-bold text-muted hover:text-foreground"
                onClick={() => void onPost({ action: r.endedAt ? "rule-reopen" : "rule-end", id: r.id })}
              >
                {r.endedAt ? "Turn back on" : "Turn off"}
              </button>
              <button
                type="button"
                className="text-xs font-bold text-danger hover:underline"
                onClick={() =>
                  window.confirm(`Delete "${r.name}"? Bonuses it already paid will disappear from the totals. To keep them, turn it off instead.`) &&
                  void onPost({ action: "rule-delete", id: r.id })
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---- The tab -------------------------------------------------------------------

// Owner only: what each team member did and what they earned, for any time
// frame. Commission rates are set per person on the Team tab.
export default function TeamPay({ onError }: { onError: (error: unknown) => void }) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - 6 * 86400_000)));
  const [to, setTo] = useState(() => dateInput(new Date()));
  const [report, setReport] = useState<PayReport | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Recomputed only when the picked frame changes, so child fetches don't loop.
  const range = useMemo(() => rangeOf(preset, from, to), [preset, from, to]);

  useEffect(() => {
    let cancelled = false;
    const q = query(range);
    crmFetch<PayReport>(`/api/crm/pay${q ? `?${q}` : ""}`)
      .then((d) => !cancelled && setReport(d))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [range, reloadKey, onError]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        await crmFetch("/api/crm/pay", { method: "POST", body });
        setReloadKey((k) => k + 1);
        return true;
      } catch (e) {
        onError(e);
        return false;
      }
    },
    [onError]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                p.id === preset ? "bg-accent text-white" : "text-muted hover:bg-background-elevated hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            to
            <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-extrabold">Team activity &amp; commissions</h2>
        <p className="text-sm text-muted">
          Only you can see this. Numbers for {range.text}. Click a person to see everything they did and each commission line.
          Commission comes from their closes (rates are set on the Team tab), bounties, bonus rules and your adjustments; your own
          closes never earn commission.
        </p>
      </div>

      {!report ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Commission earned" value={money(report.totals.earned)} detail={`By the team, ${range.text}`} />
            <StatCard label="Paid out" value={money(report.totals.paid)} detail={`Payouts you recorded, ${range.text}`} />
            <StatCard highlight label="Owed now" value={money(report.totals.owed)} detail="All time: earned minus paid out" />
          </div>

          {report.members.length === 0 ? (
            <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">No team members yet.</p>
          ) : (
            <section className="overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 text-right font-bold">Dials</th>
                    <th className="px-4 py-3 text-right font-bold">Booked</th>
                    <th className="px-4 py-3 text-right font-bold">Monthly</th>
                    <th className="px-4 py-3 text-right font-bold">Yearly</th>
                    <th className="px-4 py-3 text-right font-bold">Closes $</th>
                    <th className="px-4 py-3 text-right font-bold">Bounties</th>
                    <th className="px-4 py-3 text-right font-bold">Bonuses</th>
                    <th className="px-4 py-3 text-right font-bold">Adj.</th>
                    <th className="px-4 py-3 text-right font-bold">Earned</th>
                    <th className="px-4 py-3 text-right font-bold">Owed now</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.map((m) => {
                    const open = openId === m.userId;
                    return (
                      <MemberRow
                        key={m.userId}
                        m={m}
                        open={open}
                        onToggle={() => setOpenId(open ? null : m.userId)}
                        lines={report.lines.filter((l) => l.userId === m.userId)}
                        range={range}
                        onPost={post}
                        onError={onError}
                      />
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <BonusRules report={report} onPost={post} />
        </>
      )}
    </div>
  );
}

function MemberRow({
  m,
  open,
  onToggle,
  lines,
  range,
  onPost,
  onError,
}: {
  m: PayMemberRow;
  open: boolean;
  onToggle: () => void;
  lines: PayLine[];
  range: { from: string | null; to: string | null };
  onPost: (body: Record<string, unknown>) => Promise<boolean>;
  onError: (e: unknown) => void;
}) {
  const cell = "px-4 py-3 text-right tabular-nums";
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer border-b border-border hover:bg-background-elevated ${open ? "bg-accent/5" : ""}`}>
        <td className="px-4 py-3">
          <span className="font-bold">{open ? "▾" : "▸"} {m.name}</span>
          <span className="block text-xs text-muted">
            {m.status === "active" ? "" : m.status === "deleted" ? "Account deleted · " : "Access removed · "}
            {m.rate.monthly || m.rate.yearly
              ? `${money(m.rate.monthly)} monthly / ${money(m.rate.yearly)} yearly`
              : "No commission rate set"}
            {m.lastActiveAt ? ` · active ${timeAgo(m.lastActiveAt)}` : " · no activity yet"}
          </span>
        </td>
        <td className={cell}>
          {m.dials}
          <span className="block text-xs text-muted">{m.leadsCalled} leads</span>
        </td>
        <td className={cell}>{m.booked}</td>
        <td className={cell}>{m.monthly}</td>
        <td className={cell}>{m.yearly}</td>
        <td className={cell}>{money(m.base)}</td>
        <td className={cell}>{money(m.bounty)}</td>
        <td className={cell}>{money(m.bonus)}</td>
        <td className={cell}>{money(m.adjustments)}</td>
        <td className={`${cell} font-extrabold text-emerald-700`}>{money(m.earned)}</td>
        <td className={`${cell} font-extrabold`}>{money(m.owed)}</td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-background-elevated/40">
          <td colSpan={11} className="space-y-6 px-4 py-5">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><b>{m.dials}</b> dials</span>
              <span><b>{m.leadsCalled}</b> different leads called</span>
              <span><b>{m.statusChanges}</b> column moves</span>
              <span><b>{m.booked}</b> booked</span>
              <span><b>{m.claimed}</b> leads claimed</span>
              <span><b>{m.monthly + m.yearly}</b> closes</span>
              <span><b>{money(m.paidInRange)}</b> paid out in this time frame</span>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Lines member={m} lines={lines} onPost={onPost} />
              {m.status === "deleted" ? null : <Activity member={m} range={range} onError={onError} />}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
