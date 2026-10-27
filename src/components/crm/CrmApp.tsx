"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { logout } from "@/app/crm/actions";
import {
  OPT_IN_SOURCES,
  SOURCES,
  classifyField,
  type Access,
  type Lead,
  type LeadEvent,
  type SourceId,
  type StatusId,
} from "@/lib/crm/constants";
import AddLeadsDialog from "./AddLeadsDialog";
import AppointmentDialog from "./AppointmentDialog";
import Board from "./Board";
import CallBar from "./CallBar";
import Dashboard from "./Dashboard";
import LeadDrawer, { type LeadPatch } from "./LeadDrawer";
import Team from "./Team";
import { crmFetch } from "./api";
import { armChime, playChime, soundSetting } from "./chime";
import { useDialer } from "./useDialer";

type View = "dashboard" | "team" | SourceId;
type LeadCache = Partial<Record<SourceId, Lead[]>>;

const DIAL_LISTS = SOURCES.filter((s) => s.group === "dial");

// True when an earlier import left this lead's phone or email sitting in its
// extra info instead of the real field.
function hasMisfiledContact(lead: Lead) {
  if (lead.phone && lead.email) return false;
  return Object.keys(lead.extra).some((key) => {
    const field = classifyField(key);
    return (field === "phone" && !lead.phone) || (field === "email" && !lead.email);
  });
}

const POLL_MS = 10_000;

const tab = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-bold transition-colors ${
    active ? "bg-accent text-white" : "text-muted hover:bg-background-elevated hover:text-foreground"
  }`;

export default function CrmApp({
  user,
}: {
  user: { role: "owner" | "member"; id: string; name: string; access: Access };
}) {
  const [view, setView] = useState<View>("dashboard");
  const [cache, setCache] = useState<LeadCache>({});
  // Bumped when a new opt-in arrives so the dashboard reloads its numbers.
  const [statsKey, setStatsKey] = useState(0);
  const [search, setSearch] = useState("");
  // Board filter: only leads claimed by this person.
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"single" | "import" | null>(null);
  // The lead waiting for an appointment time before it can move columns.
  const [booking, setBooking] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const repaired = useRef(new Set<SourceId>());
  // New free-course opt-ins that arrived while this page was open, and how
  // many each opt-in tab hasn't seen yet.
  const [arrived, setArrived] = useState<Lead[]>([]);
  const [unseen, setUnseen] = useState<Partial<Record<SourceId, number>>>({});
  // Accounts waiting for the owner's approval (owner only).
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const soundOn = useSyncExternalStore(
    soundSetting.subscribe,
    soundSetting.isOn,
    soundSetting.isOnServer
  );
  const viewRef = useRef<View>("dashboard");

  const source = view === "dashboard" || view === "team" ? null : view;
  const leads = source ? cache[source] : undefined;
  const selected = leads?.find((l) => l.id === selectedId) ?? null;

  const report = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "Something went wrong.");
  }, []);

  const putLead = useCallback((lead: Lead) => {
    setCache((c) => ({
      ...c,
      [lead.source]: c[lead.source]?.map((l) => (l.id === lead.id ? lead : l)),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (view === "team" || view === "dashboard") {
      // These screens load their own data.
    } else {
      const load = () =>
        crmFetch<{ leads: Lead[] }>(`/api/crm/leads?source=${view}`);
      load()
        .then(async (data) => {
          // Fix leads whose phone/email was filed under extra info, once per
          // list per visit, then show the corrected list.
          if (!repaired.current.has(view) && data.leads.some(hasMisfiledContact)) {
            repaired.current.add(view);
            await crmFetch("/api/crm/leads/repair", { method: "POST" });
            data = await load();
          }
          if (!cancelled) setCache((c) => ({ ...c, [view]: data.leads }));
        })
        .catch((e) => !cancelled && report(e));
    }
    return () => {
      cancelled = true;
    };
  }, [view, report]);

  // Reload the open list every 20 seconds so claims, calls and moves made by
  // teammates show up without a refresh.
  useEffect(() => {
    if (view === "team" || view === "dashboard") return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await crmFetch<{ leads: Lead[] }>(`/api/crm/leads?source=${view}`);
        if (!stopped) setCache((c) => ({ ...c, [view]: data.leads }));
      } catch {
        // Try again next time.
      }
    }, 20_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [view]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Unlock audio on the first click or key press (browsers block sound
  // before that).
  useEffect(() => {
    window.addEventListener("pointerdown", armChime);
    window.addEventListener("keydown", armChime);
    return () => {
      window.removeEventListener("pointerdown", armChime);
      window.removeEventListener("keydown", armChime);
    };
  }, []);

  // Check for new free-course opt-ins every few seconds: add them to the
  // board, chime, and show a notice, with no refresh needed.
  const seesApplications = user.access.applications;
  useEffect(() => {
    if (!seesApplications) return;
    let cursor: string | null = null;
    let stopped = false;

    async function poll() {
      try {
        const query = cursor ? `?since=${encodeURIComponent(cursor)}` : "";
        const data = await crmFetch<{ cursor: string; leads: Lead[] }>(
          `/api/crm/leads/new${query}`
        );
        if (stopped) return;
        cursor = data.cursor;
        if (data.leads.length === 0) return;

        setCache((c) => {
          // Re-opt-ins are leads we already have; move them to the top with
          // their new status. Each lead goes to its own tab (organic / ads).
          const next = { ...c };
          for (const src of OPT_IN_SOURCES) {
            const current = c[src];
            const incoming = data.leads.filter((l) => l.source === src);
            if (!current || incoming.length === 0) continue;
            const updated = new Set(incoming.map((l) => l.id));
            next[src] = [...incoming, ...current.filter((l) => !updated.has(l.id))];
          }
          return next;
        });
        setArrived((a) => [...data.leads, ...a].slice(0, 5));
        setUnseen((u) => {
          const next = { ...u };
          for (const l of data.leads) {
            if (viewRef.current !== l.source) next[l.source] = (next[l.source] ?? 0) + 1;
          }
          return next;
        });
        if (viewRef.current === "dashboard") {
          setStatsKey((k) => k + 1);
        }
        if (soundSetting.isOn()) playChime();
      } catch {
        // A missed check is fine; the next one catches up from the cursor.
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [seesApplications]);

  // Let the owner know when someone is waiting for approval.
  useEffect(() => {
    if (user.role !== "owner") return;
    let stopped = false;
    const check = () =>
      crmFetch<{ team: { status: string }[] }>("/api/crm/team")
        .then((data) => {
          if (!stopped) {
            setPendingAccounts(data.team.filter((m) => m.status === "pending").length);
          }
        })
        .catch(() => {});
    check();
    const timer = setInterval(check, 60_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [user.role]);

  function toggleSound() {
    const on = !soundOn;
    soundSetting.set(on);
    if (on) {
      armChime();
      playChime();
    }
  }

  const patchLead = useCallback(
    async (lead: Lead, patch: LeadPatch): Promise<LeadEvent[] | null> => {
      // Show the change straight away, then confirm with the server.
      const { appointment, ...fields } = patch;
      const leavingAppointment = fields.status && fields.status !== "appointment";
      if (!appointment) {
        putLead({
          ...lead,
          ...fields,
          ...(leavingAppointment ? { appointmentAt: null, appointmentTz: null } : {}),
        });
      }
      try {
        const data = await crmFetch<{ lead: Lead; events: LeadEvent[] }>(
          `/api/crm/leads/${lead.id}`,
          { method: "PATCH", body: patch }
        );
        putLead(data.lead);
        return data.events;
      } catch (e) {
        putLead(lead);
        report(e);
        return null;
      }
    },
    [putLead, report]
  );

  const handleCallEnded = useCallback(
    async (lead: Lead) => {
      setSelectedId(lead.id);
      setOutcomeFor(lead.id);
      try {
        const data = await crmFetch<{ lead: Lead }>(`/api/crm/leads/${lead.id}`);
        putLead(data.lead);
      } catch {
        // The call count refreshes next time the list loads.
      }
    },
    [putLead]
  );

  // Moving into "Appointment scheduled" (by drag or button) first asks when.
  const changeStatus = useCallback(
    (lead: Lead, status: StatusId) => {
      if (status === "appointment" && lead.status !== "appointment") {
        setBooking(lead);
        return Promise.resolve(null);
      }
      return patchLead(lead, { status });
    },
    [patchLead]
  );

  const dialer = useDialer(handleCallEnded);
  const canCall = dialer.state.phase === "idle";

  const claimLead = useCallback(
    async (lead: Lead, claim: boolean): Promise<LeadEvent[] | null> => {
      try {
        const data = await crmFetch<{ lead: Lead; events: LeadEvent[] }>(
          `/api/crm/leads/${lead.id}`,
          { method: "PATCH", body: { claim } }
        );
        putLead(data.lead);
        return data.events;
      } catch (e) {
        report(e);
        // Someone may have claimed it first: show who.
        crmFetch<{ lead: Lead }>(`/api/crm/leads/${lead.id}`)
          .then((data) => putLead(data.lead))
          .catch(() => {});
        return null;
      }
    },
    [putLead, report]
  );

  // Calling claims an unclaimed lead (the server records it). Calling a lead
  // someone else claimed asks first.
  function callLead(lead: Lead) {
    if (
      lead.claimedById &&
      lead.claimedById !== user.id &&
      !window.confirm(`${lead.claimedByName || "Someone else"} claimed this lead. Call anyway?`)
    ) {
      return;
    }
    if (!lead.claimedById) {
      putLead({ ...lead, claimedById: user.id, claimedByName: user.name, claimedAt: new Date().toISOString() });
    }
    dialer.call(lead);
  }

  async function deleteLead(lead: Lead) {
    try {
      await crmFetch(`/api/crm/leads/${lead.id}`, { method: "DELETE" });
      setCache((c) => ({
        ...c,
        [lead.source]: c[lead.source]?.filter((l) => l.id !== lead.id),
      }));
      setSelectedId(null);
    } catch (e) {
      report(e);
    }
  }

  function go(next: View) {
    setView(next);
    if ((OPT_IN_SOURCES as readonly string[]).includes(next)) {
      setUnseen((u) => ({ ...u, [next]: 0 }));
    }
    setSearch("");
    setSelectedId(null);
  }

  const inDialGroup = DIAL_LISTS.some((s) => s.id === view);
  const activeList = SOURCES.find((s) => s.id === source);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <p className="mr-4 text-lg font-extrabold">
          Mad Media <span className="text-accent">CRM</span>
        </p>
        <nav className="flex flex-wrap items-center gap-1">
          <button type="button" className={tab(view === "dashboard")} onClick={() => go("dashboard")}>
            Dashboard
          </button>
          {user.access.applications
            ? OPT_IN_SOURCES.map((src) => (
                <button key={src} type="button" className={tab(view === src)} onClick={() => go(src)}>
                  {SOURCES.find((s) => s.id === src)!.label}
                  {(unseen[src] ?? 0) > 0 ? (
                    <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
                      {unseen[src]} new
                    </span>
                  ) : null}
                </button>
              ))
            : null}
          {user.access.dial ? (
            <button
              type="button"
              className={tab(inDialGroup)}
              onClick={() => !inDialGroup && go(DIAL_LISTS[0].id)}
            >
              Leads to dial
            </button>
          ) : null}
          {user.role === "owner" ? (
            <button type="button" className={tab(view === "team")} onClick={() => go("team")}>
              Team
              {pendingAccounts > 0 ? (
                <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
                  {pendingAccounts}
                </span>
              ) : null}
            </button>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={toggleSound}
          className="ml-auto text-sm font-bold text-muted hover:text-foreground"
        >
          {soundOn ? "Sound on" : "Sound off"}
        </button>
        <span className="text-sm text-muted">{user.name}</span>
        <form action={logout}>
          <button type="submit" className="text-sm font-bold text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      {error ? (
        <div className="flex items-center gap-4 bg-danger px-6 py-2 text-sm font-semibold text-white">
          <span>{error}</span>
          <button type="button" className="ml-auto underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {view === "team" ? (
        <main className="flex-1 overflow-y-auto bg-background-elevated/40">
          <Team onPendingChange={setPendingAccounts} onError={report} />
        </main>
      ) : view === "dashboard" ? (
        <main className="flex-1 overflow-y-auto bg-background-elevated/40">
          <Dashboard refreshKey={statsKey} onError={report} />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 px-6 py-4">
            {inDialGroup ? (
              <div className="flex gap-1 rounded-full border border-border p-1">
                {DIAL_LISTS.map((list) => (
                  <button key={list.id} type="button" className={tab(view === list.id)} onClick={() => go(list.id)}>
                    {list.label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted">
              {leads ? `${leads.length} leads. ` : ""}
              {activeList?.description}
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyMine((v) => !v)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  onlyMine ? "border-accent bg-accent text-white" : "border-border hover:border-accent"
                }`}
              >
                My leads
              </button>
              <input
                type="search"
                placeholder="Search name, phone, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setDialog("single")}
                className="rounded-full border border-border px-4 py-2 text-sm font-bold hover:border-accent"
              >
                Add lead
              </button>
              <button
                type="button"
                onClick={() => setDialog("import")}
                className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim"
              >
                Import leads
              </button>
            </div>
          </div>

          {leads ? (
            <Board
              leads={onlyMine ? leads.filter((l) => l.claimedById === user.id) : leads}
              me={user.id}
              search={search}
              canCall={canCall}
              onOpen={(lead) => {
                setSelectedId(lead.id);
                setOutcomeFor(null);
              }}
              onMove={(lead, status: StatusId) => changeStatus(lead, status)}
              onCall={callLead}
            />
          ) : (
            <p className="px-6 text-muted">Loading leads…</p>
          )}
        </main>
      )}

      {selected ? (
        <LeadDrawer
          key={selected.id}
          lead={selected}
          askOutcome={outcomeFor === selected.id}
          canCall={canCall}
          onClose={() => {
            setSelectedId(null);
            setOutcomeFor(null);
          }}
          onSave={(patch) => {
            if (patch.status) {
              setOutcomeFor(null);
              return changeStatus(selected, patch.status);
            }
            return patchLead(selected, patch);
          }}
          onReschedule={() => setBooking(selected)}
          onDelete={() => deleteLead(selected)}
          onCall={() => callLead(selected)}
          me={user.id}
          isOwner={user.role === "owner"}
          onClaim={(claim) => claimLead(selected, claim)}
        />
      ) : null}

      {booking ? (
        <AppointmentDialog
          key={booking.id}
          lead={booking}
          onCancel={() => setBooking(null)}
          onConfirm={async (appointment) => {
            // Saved here rather than through patchLead so a problem shows
            // inside the dialog instead of behind it.
            try {
              const data = await crmFetch<{ lead: Lead }>(`/api/crm/leads/${booking.id}`, {
                method: "PATCH",
                body: { status: "appointment", appointment },
              });
              putLead(data.lead);
              setBooking(null);
              return null;
            } catch (e) {
              return e instanceof Error ? e.message : "Couldn't save the appointment.";
            }
          }}
        />
      ) : null}

      {dialog && source ? (
        <AddLeadsDialog
          source={source}
          mode={dialog}
          onClose={() => setDialog(null)}
          onAdded={() => {
            // Reload so the new leads land in their proper place in the list.
            crmFetch<{ leads: Lead[] }>(`/api/crm/leads?source=${source}`)
              .then((data) => setCache((c) => ({ ...c, [source]: data.leads })))
              .catch(report);
          }}
        />
      ) : null}

      {arrived.length > 0 ? (
        <div className="fixed right-4 top-20 z-40 w-80 space-y-2">
          {arrived.map((lead) => (
            <div
              key={lead.id}
              className="flex items-start gap-3 rounded-2xl border border-accent bg-background p-4 shadow-xl"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  go(lead.source);
                  setSelectedId(lead.id);
                  setArrived((a) => a.filter((l) => l.id !== lead.id));
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {lead.source === "ad_free_course_application" ? "Ad · " : "Organic · "}
                  {lead.optInCount > 1
                    ? `Opted in again (${lead.optInCount}×)`
                    : "New free course opt-in"}
                </p>
                <p className="mt-1 truncate font-bold">{lead.name || "No name"}</p>
                <p className="truncate text-sm text-muted">
                  {lead.phone || lead.email}
                </p>
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setArrived((a) => a.filter((l) => l.id !== lead.id))}
                className="rounded-full px-2 text-lg text-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <CallBar
        state={dialer.state}
        onHangUp={dialer.hangUp}
        onToggleMute={dialer.toggleMute}
        onDismissError={dialer.clearError}
      />
    </div>
  );
}
