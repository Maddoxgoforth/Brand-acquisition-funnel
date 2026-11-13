"use client";

import { useEffect, useState } from "react";

import { crmFetch, timeAgo } from "./api";

type Member = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "active" | "disabled";
  access: { applications: boolean; dial: boolean };
  createdAt: string;
  lastLoginAt: string | null;
};

const STATUS_LABEL: Record<Member["status"], string> = {
  pending: "Waiting for approval",
  active: "Has access",
  disabled: "Access removed",
};

const STATUS_STYLE: Record<Member["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  disabled: "bg-slate-200 text-slate-700",
};

type Rate = { monthly: number; yearly: number; builderYearly: number };

// Commission per close for one person. A new rate counts from now on unless
// "apply to past closes too" is ticked.
function CommissionRate({
  member,
  rate,
  onSaved,
  onError,
}: {
  member: Member;
  rate: Rate | undefined;
  onSaved: () => void;
  onError: (error: unknown) => void;
}) {
  const [monthly, setMonthly] = useState(String(rate?.monthly ?? 0));
  const [yearly, setYearly] = useState(String(rate?.yearly ?? 0));
  const [builderYearly, setBuilderYearly] = useState(String(rate?.builderYearly ?? 100));
  const [past, setPast] = useState(false);
  const [saved, setSaved] = useState(false);
  const changed =
    Number(monthly) !== (rate?.monthly ?? 0) ||
    Number(yearly) !== (rate?.yearly ?? 0) ||
    Number(builderYearly) !== (rate?.builderYearly ?? 100);
  const first = !rate || (rate.monthly === 0 && rate.yearly === 0);

  async function save() {
    const was = `$${rate?.monthly ?? 0} Builder Monthly / $${rate?.yearly ?? 0} Starter Yearly / $${rate?.builderYearly ?? 100} Builder Yearly`;
    const now = `$${Number(monthly)} Builder Monthly / $${Number(yearly)} Starter Yearly / $${Number(builderYearly)} Builder Yearly`;
    const which = first || past ? "all of their closes, including past ones" : "their closes from now on";
    if (!window.confirm(`Change ${member.name}'s commission?\n\nFrom: ${was}\nTo: ${now}\n\nThis counts for ${which}.`)) return;
    try {
      await crmFetch("/api/crm/pay", {
        method: "POST",
        body: { action: "rate", userId: member.id, monthly: Number(monthly), yearly: Number(yearly), builderYearly: Number(builderYearly), applyToPast: past },
      });
      setSaved(true);
      setPast(false);
      onSaved();
    } catch (e) {
      onError(e);
    }
  }

  const box = "w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm tabular-nums";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="font-semibold">Commission per close:</span>
      <label className="flex items-center gap-1">
        Builder Monthly $
        <input className={box} type="number" min={0} value={monthly} onChange={(e) => { setMonthly(e.target.value); setSaved(false); }} />
      </label>
      <label className="flex items-center gap-1">
        Starter Yearly $
        <input className={box} type="number" min={0} value={yearly} onChange={(e) => { setYearly(e.target.value); setSaved(false); }} />
      </label>
      <label className="flex items-center gap-1">
        Builder Yearly $
        <input className={box} type="number" min={0} value={builderYearly} onChange={(e) => { setBuilderYearly(e.target.value); setSaved(false); }} />
      </label>
      {changed ? (
        <>
          {!first ? (
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} />
              Also apply to their past closes
            </label>
          ) : null}
          <button type="button" onClick={save} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-accent-dim">
            Save
          </button>
        </>
      ) : saved ? (
        <span className="text-xs font-bold text-emerald-700">Saved</span>
      ) : null}
      <span className="w-full text-xs text-muted">
        {first
          ? "The first rate you set also counts for closes they already made."
          : "A new rate counts for closes from now on, unless you tick the box."}{" "}
        Only you see this.
      </span>
    </div>
  );
}

const button =
  "rounded-full border border-border px-3 py-1.5 text-sm font-bold hover:border-accent disabled:opacity-40";

// Owner-only screen: approve sign-ups, remove or restore access, delete
// accounts. `onPendingChange` keeps the tab's badge in step.
export default function Team({
  onPendingChange,
  onError,
}: {
  onPendingChange: (count: number) => void;
  onError: (error: unknown) => void;
}) {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, Rate> | null>(null);
  const [ratesKey, setRatesKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    crmFetch<{ members: { userId: string; rate: Rate }[] }>("/api/crm/pay")
      .then((d) => !cancelled && setRates(Object.fromEntries(d.members.map((m) => [m.userId, m.rate]))))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [ratesKey, onError]);

  useEffect(() => {
    let cancelled = false;
    crmFetch<{ team: Member[] }>("/api/crm/team")
      .then((data) => !cancelled && setTeam(data.team))
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    if (team) onPendingChange(team.filter((m) => m.status === "pending").length);
  }, [team, onPendingChange]);

  async function setStatus(member: Member, status: "active" | "disabled") {
    setBusy(member.id);
    try {
      const data = await crmFetch<{ member: Member }>(`/api/crm/team/${member.id}`, {
        method: "PATCH",
        body: { status },
      });
      setTeam((t) => t?.map((m) => (m.id === member.id ? data.member : m)) ?? null);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  async function setAccess(member: Member, access: Member["access"]) {
    // Tick the box straight away, then confirm with the server.
    setTeam((t) => t?.map((m) => (m.id === member.id ? { ...m, access } : m)) ?? null);
    try {
      const data = await crmFetch<{ member: Member }>(`/api/crm/team/${member.id}`, {
        method: "PATCH",
        body: { access },
      });
      setTeam((t) => t?.map((m) => (m.id === member.id ? data.member : m)) ?? null);
    } catch (e) {
      setTeam((t) => t?.map((m) => (m.id === member.id ? member : m)) ?? null);
      onError(e);
    }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Delete ${member.name}'s account for good? They would have to sign up again.`)) {
      return;
    }
    setBusy(member.id);
    try {
      await crmFetch(`/api/crm/team/${member.id}`, { method: "DELETE" });
      setTeam((t) => t?.filter((m) => m.id !== member.id) ?? null);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  }

  if (!team) return <p className="p-8 text-muted">Loading team…</p>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-extrabold">Team access</h2>
        <p className="mt-1 text-sm text-muted">
          People create their own account at{" "}
          <span className="font-mono text-foreground">/crm/signup</span>. Nobody can
          sign in until you approve them here, and removing access signs them
          out within seconds. Tick what each person is allowed to see; changes
          apply the next time they load a list.
        </p>
      </div>

      {team.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">
          No accounts yet. Send your closer the sign-up link and their request
          will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{member.name}</p>
                <p className="truncate text-sm text-muted">{member.email}</p>
                <p className="mt-1 text-xs text-muted">
                  Signed up {timeAgo(member.createdAt)}
                  {member.lastLoginAt
                    ? `, last signed in ${timeAgo(member.lastLoginAt)}`
                    : ", never signed in"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="font-semibold">Can see:</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={member.access.applications}
                      onChange={(e) =>
                        setAccess(member, { ...member.access, applications: e.target.checked })
                      }
                    />
                    Free course opt-ins
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={member.access.dial}
                      onChange={(e) =>
                        setAccess(member, { ...member.access, dial: e.target.checked })
                      }
                    />
                    Leads to dial
                  </label>
                </div>
                {member.status !== "pending" && rates ? (
                  <CommissionRate
                    key={`${member.id}-${rates[member.id]?.monthly ?? 0}-${rates[member.id]?.yearly ?? 0}-${rates[member.id]?.builderYearly ?? 100}`}
                    member={member}
                    rate={rates[member.id]}
                    onSaved={() => setRatesKey((k) => k + 1)}
                    onError={onError}
                  />
                ) : null}
                {!member.access.applications && !member.access.dial ? (
                  <p className="mt-1 text-xs text-danger">
                    With both unticked they can sign in but won&apos;t see any leads.
                  </p>
                ) : null}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[member.status]}`}>
                {STATUS_LABEL[member.status]}
              </span>
              <div className="flex gap-2">
                {member.status === "pending" ? (
                  <button type="button" disabled={busy === member.id} onClick={() => setStatus(member, "active")} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white hover:bg-accent-dim disabled:opacity-40">
                    Approve
                  </button>
                ) : null}
                {member.status === "active" ? (
                  <button type="button" disabled={busy === member.id} onClick={() => setStatus(member, "disabled")} className={button}>
                    Remove access
                  </button>
                ) : null}
                {member.status === "disabled" ? (
                  <button type="button" disabled={busy === member.id} onClick={() => setStatus(member, "active")} className={button}>
                    Restore access
                  </button>
                ) : null}
                <button type="button" disabled={busy === member.id} onClick={() => remove(member)} className="rounded-full px-3 py-1.5 text-sm font-bold text-danger hover:underline disabled:opacity-40">
                  {member.status === "pending" ? "Decline" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
