"use client";

import { useEffect, useState } from "react";

import type { CommissionRate, PayLine } from "@/lib/crm/constants";
import { crmFetch } from "./api";
import { StatCard } from "./statsUi";

// A closer's own pay: owed, paid, earned, their rates and every commission
// and payout line (owner's request, Nov 16 2026). GET /api/crm/pay/me.
type Data = {
  rate: CommissionRate;
  earned: number;
  paid: number;
  owed: number;
  thisMonth: number;
  lastPayout: { amount: number; at: string } | null;
  lines: PayLine[];
};

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const KIND: Record<PayLine["kind"], [string, string]> = {
  close: ["Commission", "bg-emerald-100 text-emerald-800"],
  bounty: ["Bounty", "bg-amber-100 text-amber-800"],
  bonus: ["Bonus", "bg-indigo-100 text-indigo-800"],
  adjustment: ["Adjustment", "bg-slate-200 text-slate-700"],
  payout: ["Paid out", "bg-accent/15 text-accent"],
};

export default function MyPay({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "payouts">("all");

  useEffect(() => {
    crmFetch<Data>("/api/crm/pay/me").then(setData).catch(onError);
  }, [onError]);

  if (!data) return <p className="p-8 text-sm text-muted">Loading…</p>;

  const lines = data.lines.filter((l) =>
    filter === "all" ? true : filter === "payouts" ? l.kind === "payout" : l.kind !== "payout"
  );
  const payouts = data.lines.filter((l) => l.kind === "payout");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">💵 My pay</h1>
        <p className="text-sm text-muted">What you&apos;ve earned from your closes, what&apos;s been paid, and what you&apos;re still owed.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Owed to you" value={money(data.owed)} detail="Earned minus what's been paid" highlight />
        <StatCard label="Earned this month" value={money(data.thisMonth)} detail="Commissions, bounties and bonuses" />
        <StatCard label="Total earned" value={money(data.earned)} detail="All time" />
        <StatCard
          label="Total paid"
          value={money(data.paid)}
          detail={data.lastPayout ? `Last payout ${money(data.lastPayout.amount)} on ${day(data.lastPayout.at)}` : "No payouts yet"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="text-sm font-bold">Your rates per close</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-background-elevated px-3 py-1">Builder Monthly <b>{money(data.rate.monthly)}</b></span>
          <span className="rounded-full bg-background-elevated px-3 py-1">Starter Yearly <b>{money(data.rate.yearly)}</b></span>
          <span className="rounded-full bg-background-elevated px-3 py-1">Builder Yearly <b>{money(data.rate.builderYearly)}</b></span>
        </div>
        <p className="mt-2 text-xs text-muted">If a close is moved out of Closed (refund, mistake), its commission comes off automatically.</p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-extrabold">History</p>
          <div className="flex gap-1 rounded-full border border-border p-1 text-sm font-bold">
            {(
              [
                ["all", "Everything"],
                ["earned", "Earned"],
                ["payouts", `Payouts (${payouts.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1 ${filter === k ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {filter === "payouts" ? "No payouts yet." : "Nothing here yet. Your closes show up here with their commission."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Details</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const [label, color] = KIND[l.kind];
                  return (
                    <tr key={`${l.kind}-${l.at}-${i}`} className="border-t border-border">
                      <td className="py-2 pr-3 whitespace-nowrap">{day(l.at)}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>
                      </td>
                      <td className="py-2 pr-3">{l.label}</td>
                      <td className={`py-2 text-right font-bold tabular-nums ${l.kind === "payout" ? "text-accent" : ""}`}>
                        {l.kind === "payout" ? `−${money(l.amount)}` : money(l.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
