"use client";

import { useCallback, useEffect, useState } from "react";

import { PAY_PLANS, payPlanNoun, type Bounty, type PayPlan } from "@/lib/crm/constants";
import { crmFetch } from "./api";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function bountyReward(b: Pick<Bounty, "amount" | "mode" | "plan">) {
  return b.mode === "extra"
    ? `+${money(b.amount)} extra commission per ${payPlanNoun(b.plan)}`
    : `${money(b.amount)} commission per ${payPlanNoun(b.plan)}`;
}

const STATE = {
  live: { label: "Live", style: "bg-emerald-100 text-emerald-800" },
  done: { label: "All spots claimed", style: "bg-amber-100 text-amber-800" },
  ended: { label: "Ended", style: "bg-slate-200 text-slate-700" },
} as const;

function BountyCard({
  b,
  owner,
  onAction,
}: {
  b: Bounty;
  owner: boolean;
  onAction: (action: "end" | "reopen" | "delete", b: Bounty) => void;
}) {
  const filled = b.claims.length;
  const left = Math.max(0, b.target - filled);
  return (
    <div
      className={`rounded-2xl border p-5 ${
        b.state === "live" ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white" : "border-border bg-background"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold">🎯 {b.title}</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-700">{bountyReward(b)}</p>
          <p className="text-xs text-muted">
            For the next {b.target} {payPlanNoun(b.plan)}
            {b.target === 1 ? "" : "s"} closed by the team
            {b.mode === "replace" ? ", instead of the normal commission" : ", on top of the normal commission"}.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATE[b.state].style}`}>
          {STATE[b.state].label}
        </span>
      </div>
      {b.description ? <p className="mt-2 whitespace-pre-line text-sm">{b.description}</p> : null}

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-extrabold tabular-nums">
            {filled} of {b.target} closed
          </span>
          <span className="text-muted">
            {b.state === "live" ? `${left} spot${left === 1 ? "" : "s"} left` : null}
            {b.endsAt && b.state === "live" ? ` · ends ${day(b.endsAt)}` : null}
          </span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
            style={{ width: `${Math.min(100, (filled / b.target) * 100)}%` }}
          />
        </div>
      </div>

      {filled > 0 ? (
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {b.claims.map((c, i) => (
            <li key={i} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-border">
              #{i + 1} {c.name} <span className="font-normal text-muted">· {day(c.closedAt)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {owner ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-xs font-bold">
          {b.state === "live" ? (
            <button type="button" className="text-muted hover:text-foreground" onClick={() => onAction("end", b)}>
              End early
            </button>
          ) : b.endedAt && b.state === "ended" ? (
            <button type="button" className="text-muted hover:text-foreground" onClick={() => onAction("reopen", b)}>
              Reopen
            </button>
          ) : null}
          <button type="button" className="text-danger hover:underline" onClick={() => onAction("delete", b)}>
            Delete
          </button>
          <span className="font-normal text-muted">Started {day(b.startsAt)}. Your own closes don&apos;t count.</span>
        </div>
      ) : null}
    </div>
  );
}

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

function NewBounty({ onCreate, onCancel }: { onCreate: (body: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<PayPlan>("yearly");
  const [target, setTarget] = useState("6");
  const [amount, setAmount] = useState("80");
  const [mode, setMode] = useState<"replace" | "extra">("replace");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({
        action: "create",
        title,
        description,
        plan,
        target: Number(target),
        amount: Number(amount),
        mode,
        // End of the picked day, in this computer's time zone.
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-accent/40 bg-accent/5 p-5">
      <p className="font-extrabold">New bounty</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          Name
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yearly close sprint" required />
        </label>
        <label className="text-sm font-semibold">
          Which closes count
          <select className={input} value={plan} onChange={(e) => setPlan(e.target.value as PayPlan)}>
            {PAY_PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          How many closes (spots)
          <input className={input} type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          Commission per close ($)
          <input className={input} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          How it pays
          <select className={input} value={mode} onChange={(e) => setMode(e.target.value as "replace" | "extra")}>
            <option value="replace">Instead of their normal commission</option>
            <option value="extra">On top of their normal commission</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Deadline (optional)
          <input className={input} type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Note for the team (optional)
          <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-muted">
        Starts now. The next {target || "N"} {payPlanNoun(plan)}s closed by team members take the spots in order; your own closes
        don&apos;t count. If a close is moved back out of Closed, its spot opens up again.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim disabled:opacity-40">
          Post bounty
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

// The bounty board: on the Dashboard and Leaderboard for everyone; only the
// owner can post, end or delete bounties.
export default function Bounties({
  owner,
  onError,
  dark,
}: {
  owner: boolean;
  onError: (error: unknown) => void;
  dark?: boolean;
}) {
  const [bounties, setBounties] = useState<Bounty[] | null>(null);
  // When the list was loaded, for "finished in the last 14 days".
  const [loadedAt, setLoadedAt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(() => {
    crmFetch<{ bounties: Bounty[] }>("/api/crm/bounties")
      .then((d) => {
        setBounties(d.bounties);
        setLoadedAt(Date.now());
      })
      .catch(onError);
  }, [onError]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function post(body: Record<string, unknown>) {
    try {
      const d = await crmFetch<{ bounties: Bounty[] }>("/api/crm/bounties", { method: "POST", body });
      setBounties(d.bounties);
      setLoadedAt(Date.now());
      setCreating(false);
    } catch (e) {
      onError(e);
    }
  }

  function act(action: "end" | "reopen" | "delete", b: Bounty) {
    if (action === "delete" && !window.confirm(`Delete the bounty "${b.title}"? Closes on it go back to normal commission.`)) return;
    if (action === "end" && !window.confirm(`End "${b.title}" now? Closes from now on won't count.`)) return;
    void post({ action, id: b.id });
  }

  if (!bounties) return null;
  const live = bounties.filter((b) => b.state === "live");
  // Finished in the last 14 days, so the team sees who got the spots.
  const recent = bounties.filter(
    (b) => b.state !== "live" && loadedAt - new Date(b.endedAt ?? b.endsAt ?? b.createdAt).getTime() < 14 * 86400_000
  );
  const past = showPast ? bounties.filter((b) => b.state !== "live") : recent;
  if (!owner && live.length === 0 && past.length === 0) return null;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={`text-lg font-extrabold ${dark ? "text-white" : ""}`}>🎯 Bounties</h2>
          <p className={`text-sm ${dark ? "text-white/60" : "text-muted"}`}>
            {live.length > 0
              ? "Close these to earn more commission. Spots go in order."
              : "No live bounties right now."}
          </p>
        </div>
        {owner ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              className={`text-sm font-bold ${dark ? "text-white/70 hover:text-white" : "text-muted hover:text-foreground"}`}
            >
              {showPast ? "Hide old bounties" : "Show all old bounties"}
            </button>
            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim"
              >
                + New bounty
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-3 space-y-4">
        {creating ? <NewBounty onCreate={post} onCancel={() => setCreating(false)} /> : null}
        {live.length + past.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...live, ...past].map((b) => (
              <BountyCard key={b.id} b={b} owner={owner} onAction={act} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
