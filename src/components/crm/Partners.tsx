"use client";

import { useCallback, useEffect, useState } from "react";

import { crmFetch, timeAgo } from "./api";

// Owner's view of the Mad Media partners (people selling Base44 with the
// owner's AffiliateConsulting link + their own subid). See partners.ts.

const PLANS = [
  ["builder_monthly", "Builder Monthly"],
  ["builder_yearly", "Builder Yearly"],
  ["starter_yearly", "Starter Yearly"],
  ["starter_monthly", "Starter Monthly"],
] as const;
type PlanKey = (typeof PLANS)[number][0];
type Rates = Record<PlanKey, number>;

type PartnerRow = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "disabled";
  subid: string | null;
  linkSubid: string | null;
  rates: Rates;
  createdAt: string;
  lastLoginAt: string | null;
  links: { label: string; url: string }[];
  counts: { signups: number; purchases: number; reversals: number };
  totals: { earned: number; paid: number; owed: number };
  payouts: { amount: number; note: string; at: string }[];
  batches: Batch[];
  payoutMethod: {
    holderName: string;
    bankName: string;
    accountType: "checking" | "savings";
    routingLast4: string;
    accountLast4: string;
    updatedAt: string;
  } | null;
};
type Batch = {
  periodStart: string;
  periodEnd: string;
  sales: number;
  reversals: number;
  amount: number;
  status: "open" | "holding" | "ready" | "approved" | "paid" | "carried";
  readyOn: string;
  paidAt: string | null;
};
const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const BATCH_LABEL: Record<Batch["status"], [string, string]> = {
  open: ["Collecting sales", "text-muted"],
  holding: ["On hold", "text-muted"],
  ready: ["Ready to approve", "text-amber-700"],
  approved: ["Approved: pay them", "text-indigo-700"],
  paid: ["Paid", "text-emerald-700"],
  carried: ["Carried over", "text-muted"],
};
type PayoutFull = NonNullable<PartnerRow["payoutMethod"]> & { routingNumber: string; accountNumber: string };

// Their bank details: masked until the owner clicks Show (fetched on demand,
// never kept in the list data).
function PayoutMethod({ p, onError }: { p: PartnerRow; onError: (e: unknown) => void }) {
  const [full, setFull] = useState<PayoutFull | null>(null);
  const [busy, setBusy] = useState(false);
  const m = p.payoutMethod;
  if (!m) return <p className="text-xs text-muted">Payout details: not added yet (they add them on their Payments tab).</p>;
  const show = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/partners/${p.id}/payout-details`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load payout details");
      setFull(data.details);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const copy = (v: string) => navigator.clipboard?.writeText(v);
  return (
    <div className="rounded-lg bg-background-elevated px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-bold">Payout:</span> {m.bankName || "Bank"} · {m.accountType === "savings" ? "Savings" : "Checking"} ••••{" "}
          {m.accountLast4} · {m.holderName}
        </p>
        <button type="button" className={pill} disabled={busy} onClick={() => (full ? setFull(null) : show())}>
          {full ? "Hide" : "Show full numbers"}
        </button>
      </div>
      {full ? (
        <div className="mt-2 grid gap-1 font-mono text-sm sm:grid-cols-2">
          <p>
            Routing: {full.routingNumber}{" "}
            <button type="button" className="text-xs font-bold text-accent" onClick={() => copy(full.routingNumber)}>copy</button>
          </p>
          <p>
            Account: {full.accountNumber}{" "}
            <button type="button" className="text-xs font-bold text-accent" onClick={() => copy(full.accountNumber)}>copy</button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
type EventRow = {
  id: string;
  partnerId: string | null;
  manual: boolean;
  test: boolean;
  kind: string;
  subid: string;
  plan: string;
  payout: number;
  commission: number;
  at: string;
  partner: string | null;
};
type Data = { partners: PartnerRow[]; events: EventRow[]; latestRaw: unknown; webhookReady: boolean };

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const box = "w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm tabular-nums";
const pill = "rounded-full border border-border px-3 py-1.5 text-sm font-bold hover:border-accent disabled:opacity-40";
const STATUS: Record<PartnerRow["status"], [string, string]> = {
  pending: ["Waiting for approval", "bg-amber-100 text-amber-800"],
  active: ["Active", "bg-emerald-100 text-emerald-800"],
  disabled: ["Access removed", "bg-slate-200 text-slate-700"],
};

function PartnerCard({ p, reload, onError }: { p: PartnerRow; reload: () => void; onError: (e: unknown) => void }) {
  const [subid, setSubid] = useState(p.subid ?? "");
  const [linkSub, setLinkSub] = useState(p.linkSubid ?? "");
  const [rates, setRates] = useState<Rates>(p.rates);
  const [past, setPast] = useState(false);
  const [payout, setPayout] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const changed = subid !== (p.subid ?? "") || linkSub !== (p.linkSubid ?? "") || PLANS.some(([k]) => rates[k] !== p.rates[k]);

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await crmFetch(`/api/crm/partners/${p.id}`, { method: "PATCH", body });
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${p.name}'s partner account? Their sales stay recorded as yours.`)) return;
    setBusy(true);
    try {
      await crmFetch(`/api/crm/partners/${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  const [label, color] = STATUS[p.status];
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{p.name}</span>
        <span className="text-sm text-muted">{p.email}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>
        <span className="ml-auto text-xs text-muted">
          {p.lastLoginAt ? `Last signed in ${timeAgo(p.lastLoginAt)}` : `Signed up ${timeAgo(p.createdAt)}`}
        </span>
      </div>

      {p.status !== "pending" ? (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
          {[
            ["Signups", p.counts.signups],
            ["Purchases", p.counts.purchases],
            ["Reversals", p.counts.reversals],
            ["Earned", money(p.totals.earned)],
            ["Paid", money(p.totals.paid)],
            ["Owed", money(p.totals.owed)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-background-elevated px-3 py-2">
              <p className="text-xs text-muted">{k}</p>
              <p className="font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1" title="Their Shared ID: their links are your link + &sharedid=THIS, and AffiliateConsulting sends it back on every sale (shared_id), so their sales match automatically.">
          Shared ID
          <input className="w-40 rounded-lg border border-border bg-background px-2 py-1 font-mono text-sm" value={subid} onChange={(e) => setSubid(e.target.value)} placeholder="e.g. henry" />
        </label>
        <label className="flex items-center gap-1" title="Old manual mode: their links become ?subid=THIS with no shared ID, and you assign their sales by hand below. Leave empty to use the Shared ID.">
          Manual link sub-ID
          <input className="w-32 rounded-lg border border-border bg-background px-2 py-1 font-mono text-sm" value={linkSub} onChange={(e) => setLinkSub(e.target.value)} placeholder="mad-media" />
        </label>
        {PLANS.map(([k, l]) => (
          <label key={k} className="flex items-center gap-1">
            {l} $
            <input
              className={box}
              type="number"
              min={0}
              value={rates[k]}
              onChange={(e) => setRates({ ...rates, [k]: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {p.status === "pending" ? (
          <button type="button" disabled={busy || !subid.trim()} className={pill} onClick={() => act({ action: "save", subid, linkSubid: linkSub, rates, approve: true })}>
            ✅ Approve
          </button>
        ) : (
          <>
            <button type="button" disabled={busy || !changed || !subid.trim()} className={pill} onClick={() => act({ action: "save", subid, linkSubid: linkSub, rates, applyToPast: past })}>
              Save sub-ID and rates
            </button>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} /> Also apply new rates to past sales
            </label>
          </>
        )}
        {p.status === "active" ? (
          <button type="button" disabled={busy} className={pill} onClick={() => act({ action: "status", status: "disabled" }, `Remove ${p.name}'s access?`)}>
            Remove access
          </button>
        ) : p.status === "disabled" ? (
          <button type="button" disabled={busy} className={pill} onClick={() => act({ action: "status", status: "active" })}>
            Restore access
          </button>
        ) : null}
        <button type="button" disabled={busy} className={`${pill} text-danger`} onClick={remove}>
          Delete
        </button>
      </div>

      {p.linkSubid ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Manual mode: their links use ?subid={p.linkSubid} with no shared ID, so their sales aren&apos;t tagged. Clear
          &quot;Manual link sub-ID&quot; to switch them to their Shared ID link (sales then match automatically).
        </p>
      ) : null}
      <PayoutMethod p={p} onError={onError} />
      {p.links.length ? (
        <div className="space-y-1 text-xs">
          {p.links.map((l) => (
            <p key={l.url} className="font-mono text-muted">
              {l.label}: <span className="text-foreground">{l.url}</span>
            </p>
          ))}
        </div>
      ) : null}

      {p.batches.length ? (
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Payout periods</p>
          <table className="w-full text-sm">
            <tbody>
              {p.batches.map((b) => {
                const [label, color] = BATCH_LABEL[b.status];
                return (
                  <tr key={b.periodStart} className="border-t border-border">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {day(b.periodStart)} – {day(b.periodEnd)}
                    </td>
                    <td className="py-1.5 pr-3 text-muted whitespace-nowrap">
                      {b.sales} sale{b.sales === 1 ? "" : "s"}
                      {b.reversals ? `, ${b.reversals} reversed` : ""}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-bold tabular-nums">{money(b.amount)}</td>
                    <td className={`py-1.5 pr-3 font-semibold whitespace-nowrap ${color}`}>
                      {label}
                      {b.status === "holding" ? ` until ${day(b.readyOn)}` : ""}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {b.status === "ready" ? (
                        <button type="button" disabled={busy} className={pill} onClick={() => act({ action: "batch", step: "approve", periodStart: b.periodStart })}>
                          Approve
                        </button>
                      ) : b.status === "approved" ? (
                        <span className="flex justify-end gap-2">
                          <button type="button" disabled={busy} className="text-xs text-muted hover:text-foreground" onClick={() => act({ action: "batch", step: "unapprove", periodStart: b.periodStart })}>
                            Undo
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className={pill}
                            onClick={() => act({ action: "batch", step: "paid", periodStart: b.periodStart }, `Mark ${money(b.amount)} as paid to ${p.name}?`)}
                          >
                            Mark paid
                          </button>
                        </span>
                      ) : b.status === "paid" ? (
                        <button type="button" disabled={busy} className="text-xs text-muted hover:text-foreground" onClick={() => act({ action: "batch", step: "unpaid", periodStart: b.periodStart }, "Undo 'paid' for this period?")}>
                          Undo
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {p.status !== "pending" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-muted">One-off payment:</span>
          <input className={box} type="number" min={0} placeholder="$" value={payout} onChange={(e) => setPayout(e.target.value)} />
          <input className="w-48 rounded-lg border border-border bg-background px-2 py-1 text-sm" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button
            type="button"
            disabled={busy || !(Number(payout) > 0)}
            className={pill}
            onClick={async () => {
              await act({ action: "payout", amount: Number(payout), note });
              setPayout("");
              setNote("");
            }}
          >
            Record
          </button>
          {p.payouts.length ? (
            <span className="text-xs text-muted">
              Last: {money(p.payouts[0].amount)} {timeAgo(p.payouts[0].at)}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function Partners({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const reload = useCallback(() => setKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    crmFetch<Data>("/api/crm/partners")
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [key, onError]);

  async function assign(eventId: string, partnerId: string) {
    setAssigning(eventId);
    try {
      await crmFetch(`/api/crm/partners/events/${eventId}`, { method: "PATCH", body: { partnerId: partnerId || null } });
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setAssigning(null);
    }
  }

  if (!data) return <p className="text-sm text-muted">Loading partners…</p>;
  const assignable = data.partners.filter((p) => p.status === "active");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">Mad Media partners (Base44)</h2>
        <p className="mt-1 text-sm text-muted">
          Partners sign up at <span className="font-mono text-foreground">/partner/signup</span> (or on the Mad Media domain). Approve them with a
          Shared ID: their links are your AffiliateConsulting links + &amp;sharedid=that ID, and sales carrying it go on their dashboard at
          the commission you set (everything else stays yours). Sales are grouped into weekly (Mon–Sun) payout periods; 14 days after a week ends
          it shows &quot;Ready to approve&quot; here. Approve it (they see Pending), pay them, then Mark paid (they see Paid out).
          {data.webhookReady ? null : <span className="font-bold text-danger"> Webhook not set up yet (PARTNER_WEBHOOK_KEY missing).</span>}
        </p>
      </div>

      {data.partners.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">No partners yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {data.partners.map((p) => (
            <PartnerCard key={`${p.id}-${p.status}-${p.subid}-${JSON.stringify(p.rates)}`} p={p} reload={reload} onError={onError} />
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Latest webhook events</h3>
          <span className="text-xs text-muted">all sub-IDs, yours included · use &quot;Assign to&quot; to give a sale to a partner</span>
          {data.latestRaw ? (
            <button type="button" className="ml-auto text-xs font-bold text-accent hover:underline" onClick={() => setShowRaw((s) => !s)}>
              {showRaw ? "Hide" : "Show"} newest raw event
            </button>
          ) : null}
        </div>
        {showRaw ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(data.latestRaw, null, 2)}</pre>
        ) : null}
        {data.events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing received yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-1 pr-3">When</th>
                  <th className="py-1 pr-3">Event</th>
                  <th className="py-1 pr-3">Sub-ID</th>
                  <th className="py-1 pr-3">Assign to</th>
                  <th className="py-1 pr-3">Plan</th>
                  <th className="py-1 pr-3 text-right">Your payout</th>
                  <th className="py-1 text-right">Partner earns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.events.map((e, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3 text-muted">{timeAgo(e.at)}</td>
                    <td className="py-1 pr-3">
                      {e.kind}
                      {e.test ? <span className="ml-1 rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-600">TEST</span> : null}
                    </td>
                    <td className="py-1 pr-3 font-mono">{e.subid || "–"}</td>
                    <td className="py-1 pr-3">
                      <select
                        className="rounded-md border border-border bg-background px-1.5 py-0.5 text-sm disabled:opacity-50"
                        value={e.partnerId ?? ""}
                        disabled={assigning === e.id || e.kind === "unknown"}
                        onChange={(ev) => assign(e.id, ev.target.value)}
                      >
                        <option value="">You</option>
                        {assignable.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        {e.partnerId && !assignable.some((p) => p.id === e.partnerId) ? <option value={e.partnerId}>{e.partner ?? "Partner"}</option> : null}
                      </select>
                      {e.manual && e.partnerId ? <span className="ml-1 text-[10px] text-muted">by hand</span> : null}
                    </td>
                    <td className="py-1 pr-3">{e.plan || "–"}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{e.payout ? money(e.payout) : "–"}</td>
                    <td className="py-1 text-right tabular-nums">{e.partner ? money(e.commission) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
