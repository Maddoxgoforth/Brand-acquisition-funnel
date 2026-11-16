"use client";

import { useCallback, useEffect, useState } from "react";

import { crmFetch, timeAgo } from "./api";
import Partners from "./Partners";

type Rate = { monthly: number; yearly: number; builderYearly: number };
type Plan = { plan: string; label: string; closes: number; earned: number };
type AffiliateRow = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "disabled";
  code: string | null;
  link: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  rate: Rate | null;
  numbers: { visitors: number; optIns: number; closes: number; closeRate: number | null; earned: number; plans: Plan[] };
  totals: { earned: number; paid: number; owed: number };
  closes: { leadId: string; leadName: string; plan: string; closedAt: string | null; commission: number }[];
  payouts: { amount: number; note: string; at: string }[];
};

const RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: null },
] as const;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (n: number | null) => (n === null ? "–" : `${(n * 100).toFixed(1)}%`);
const box = "w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm tabular-nums";
const pill = "rounded-full border border-border px-3 py-1.5 text-sm font-bold hover:border-accent disabled:opacity-40";

const STATUS: Record<AffiliateRow["status"], [string, string]> = {
  pending: ["Waiting for approval", "bg-amber-100 text-amber-800"],
  active: ["Active", "bg-emerald-100 text-emerald-800"],
  disabled: ["Access removed", "bg-slate-200 text-slate-700"],
};

// Commission inputs, one per plan. Used to approve and to change rates.
function RateInputs({ rate, onChange }: { rate: Rate; onChange: (r: Rate) => void }) {
  const set = (k: keyof Rate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...rate, [k]: Math.max(0, Number(e.target.value) || 0) });
  return (
    <>
      <label className="flex items-center gap-1">
        Builder Monthly $<input className={box} type="number" min={0} value={rate.monthly} onChange={set("monthly")} />
      </label>
      <label className="flex items-center gap-1">
        Starter Yearly $<input className={box} type="number" min={0} value={rate.yearly} onChange={set("yearly")} />
      </label>
      <label className="flex items-center gap-1">
        Builder Yearly $<input className={box} type="number" min={0} value={rate.builderYearly} onChange={set("builderYearly")} />
      </label>
    </>
  );
}

function AffiliateCard({ a, reload, onError }: { a: AffiliateRow; reload: () => void; onError: (e: unknown) => void }) {
  const [rate, setRate] = useState<Rate>(a.rate ?? { monthly: 0, yearly: 0, builderYearly: 0 });
  const [past, setPast] = useState(false);
  const [payout, setPayout] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const rateChanged =
    !!a.rate && (rate.monthly !== a.rate.monthly || rate.yearly !== a.rate.yearly || rate.builderYearly !== a.rate.builderYearly);

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await crmFetch(`/api/crm/affiliates/${a.id}`, { method: "PATCH", body });
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${a.name}'s affiliate account for good? Their link stops working; leads they sent keep their name.`)) return;
    setBusy(true);
    try {
      await crmFetch(`/api/crm/affiliates/${a.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  const rateText = (r: Rate) => `$${r.monthly} Builder Monthly / $${r.yearly} Starter Yearly / $${r.builderYearly} Builder Yearly`;
  const n = a.numbers;

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{a.name}</p>
          <p className="truncate text-sm text-muted">{a.email}</p>
          <p className="mt-0.5 text-xs text-muted">
            Signed up {timeAgo(a.createdAt)}
            {a.lastLoginAt ? `, last signed in ${timeAgo(a.lastLoginAt)}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span>
      </div>

      {a.status === "pending" ? (
        <div className="rounded-xl bg-background-elevated p-3 text-sm">
          <p className="font-semibold">Their commission per close, then approve:</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RateInputs rate={rate} onChange={setRate} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ action: "approve", rate }, `Approve ${a.name} with ${rateText(rate)} per close?`)}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white hover:bg-accent-dim disabled:opacity-40"
            >
              Approve
            </button>
            <button type="button" disabled={busy} onClick={remove} className="rounded-full px-3 py-1.5 text-sm font-bold text-danger hover:underline">
              Decline
            </button>
          </div>
        </div>
      ) : (
        <>
          {a.link ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">Link:</span>
              <span className="break-all font-mono">{a.link}</span>
              <button
                type="button"
                className="rounded-full border border-border px-2 py-0.5 text-xs font-bold hover:border-accent"
                onClick={() => {
                  navigator.clipboard.writeText(a.link!).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
            {[
              ["Visitors", n.visitors.toLocaleString()],
              ["Opt-ins", n.optIns.toLocaleString()],
              ["Closes", n.closes.toLocaleString()],
              ["Close rate", pct(n.closeRate)],
              ["Earned (all)", money(a.totals.earned)],
              ["Owed", money(a.totals.owed)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-background-elevated px-2 py-2">
                <p className="text-[11px] font-bold uppercase text-muted">{label}</p>
                <p className={`font-extrabold tabular-nums ${label === "Owed" && a.totals.owed > 0 ? "text-amber-700" : ""}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            By plan: {n.plans.map((p) => `${p.label} ${p.closes}`).join(" · ")} · paid out {money(a.totals.paid)} all time
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-semibold">Commission per close:</span>
            <RateInputs rate={rate} onChange={setRate} />
            {rateChanged ? (
              <>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} />
                  Also apply to their past closes
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    act(
                      { action: "rate", rate, applyToPast: past },
                      `Change ${a.name}'s commission to ${rateText(rate)}?\n\nThis counts for ${past ? "all of their closes, including past ones" : "their closes from now on"}.`
                    )
                  }
                  className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-accent-dim"
                >
                  Save
                </button>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Record a payout:</span>
            <span>$</span>
            <input className={box} type="number" min={0} value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="0" />
            <input
              className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              maxLength={200}
            />
            <button
              type="button"
              disabled={busy || !(Number(payout) > 0)}
              onClick={() =>
                act({ action: "payout", amount: Number(payout), note }, `Record that you paid ${a.name} ${money(Number(payout))}?`).then(() => {
                  setPayout("");
                  setNote("");
                })
              }
              className={pill}
            >
              Save payout
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen((o) => !o)} className={pill}>
              {open ? "Hide" : "Show"} closes &amp; payouts ({a.closes.length})
            </button>
            {a.status === "active" ? (
              <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "disabled" }, `Remove ${a.name}'s access? Their link stops crediting new opt-ins.`)} className={pill}>
                Remove access
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "active" })} className={pill}>
                Restore access
              </button>
            )}
            <button type="button" disabled={busy} onClick={remove} className="rounded-full px-3 py-1.5 text-sm font-bold text-danger hover:underline">
              Delete
            </button>
          </div>

          {open ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold">Closes in this time frame</p>
                {a.closes.length === 0 ? (
                  <p className="text-muted">None yet.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-border">
                    {a.closes.map((c) => (
                      <li key={c.leadId} className="flex justify-between gap-2 py-1">
                        <span className="truncate">
                          {c.leadName || "No name"} · {c.plan}
                          <span className="ml-1 text-muted">{c.closedAt ? new Date(c.closedAt).toLocaleDateString() : ""}</span>
                        </span>
                        <span className="font-bold">{money(c.commission)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-semibold">Payouts (all time)</p>
                {a.payouts.length === 0 ? (
                  <p className="text-muted">None yet.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-border">
                    {a.payouts.map((p, i) => (
                      <li key={i} className="flex justify-between gap-2 py-1">
                        <span className="truncate">
                          {new Date(p.at).toLocaleDateString()} {p.note ? `· ${p.note}` : ""}
                        </span>
                        <span className="font-bold">{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}

// Owner-only Affiliates tab: approve sign-ups (with their commission per plan),
// see each affiliate's visitors, opt-ins and closes, and track what's owed.
export default function Affiliates({
  onPendingChange,
  onError,
}: {
  onPendingChange: (count: number) => void;
  onError: (error: unknown) => void;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30d");
  const [list, setList] = useState<AffiliateRow[] | null>(null);
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const days = RANGES.find((r) => r.id === range)!.days;
    const from = days ? new Date(Date.now() - days * 86400000).toISOString() : "";
    crmFetch<{ affiliates: AffiliateRow[] }>(`/api/crm/affiliates${from ? `?from=${encodeURIComponent(from)}` : ""}`)
      .then((d) => !cancelled && setList(d.affiliates))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [range, key, onError]);

  useEffect(() => {
    if (list) onPendingChange(list.filter((a) => a.status === "pending").length);
  }, [list, onPendingChange]);

  if (!list) return <p className="p-8 text-muted">Loading affiliates…</p>;
  const sum = (f: (a: AffiliateRow) => number) => list.reduce((s, a) => s + f(a), 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-extrabold">Affiliates</h2>
        <p className="mt-1 text-sm text-muted">
          Creators sign up at <span className="font-mono text-foreground">brandacquisition.co/affiliates/signup</span>. When you
          approve one, set what they earn per close; they get their own link to the free-course page. Opt-ins through
          it land in Organic opt-ins tagged 🤝 with their name, and closes from those leads count for them. They see
          counts, plans and money only, never lead details.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${r.id === range ? "bg-accent text-white" : "border border-border hover:border-accent"}`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted">
          {sum((a) => a.numbers.optIns)} opt-ins · {sum((a) => a.numbers.closes)} closes · {money(sum((a) => a.totals.owed))} owed
        </span>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">
          No affiliates yet. Send creators the sign-up link above and their requests will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {list.map((a) => (
            <AffiliateCard key={`${a.id}-${a.status}-${JSON.stringify(a.rate)}`} a={a} reload={reload} onError={onError} />
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-6">
        <Partners onError={onError} />
      </div>
    </div>
  );
}
