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
