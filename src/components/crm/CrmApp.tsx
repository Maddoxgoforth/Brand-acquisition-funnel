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
  SOURCES,
  classifyField,
  type Lead,
  type LeadEvent,
  type SourceId,
  type Stats,
  type StatusId,
} from "@/lib/crm/constants";
import AddLeadsDialog from "./AddLeadsDialog";
import Board from "./Board";
import CallBar from "./CallBar";
import Dashboard from "./Dashboard";
import LeadDrawer, { type LeadPatch } from "./LeadDrawer";
import { crmFetch } from "./api";
import { armChime, playChime, soundSetting } from "./chime";
import { useDialer } from "./useDialer";

type View = "dashboard" | SourceId;
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

export default function CrmApp() {
  const [view, setView] = useState<View>("dashboard");
  const [cache, setCache] = useState<LeadCache>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"single" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const repaired = useRef(new Set<SourceId>());
  // New free-course opt-ins that arrived while this page was open.
  const [arrived, setArrived] = useState<Lead[]>([]);
  const [unseen, setUnseen] = useState(0);
  const soundOn = useSyncExternalStore(
    soundSetting.subscribe,
    soundSetting.isOn,
    soundSetting.isOnServer
  );
  const viewRef = useRef<View>("dashboard");

  const source = view === "dashboard" ? null : view;
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
    if (view === "dashboard") {
      crmFetch<Stats>("/api/crm/stats")
        .then((data) => !cancelled && setStats(data))
        .catch((e) => !cancelled && report(e));
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
  useEffect(() => {
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
          const current = c.free_course_application;
          if (!current) return c;
          const known = new Set(current.map((l) => l.id));
          const fresh = data.leads.filter((l) => !known.has(l.id));
          return { ...c, free_course_application: [...fresh, ...current] };
        });
        setArrived((a) => [...data.leads, ...a].slice(0, 5));
        if (viewRef.current !== "free_course_application") {
          setUnseen((n) => n + data.leads.length);
        }
        if (viewRef.current === "dashboard") {
          crmFetch<Stats>("/api/crm/stats").then(setStats).catch(() => {});
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
  }, []);

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
      putLead({ ...lead, ...patch });
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

  const dialer = useDialer(handleCallEnded);
  const canCall = dialer.state.phase === "idle";

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
    if (next === "free_course_application") setUnseen(0);
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
          <button
            type="button"
            className={tab(view === "free_course_application")}
            onClick={() => go("free_course_application")}
          >
            Free course applications
            {unseen > 0 ? (
              <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
                {unseen} new
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={tab(inDialGroup)}
            onClick={() => !inDialGroup && go(DIAL_LISTS[0].id)}
          >
            Leads to dial
          </button>
        </nav>
        <button
          type="button"
          onClick={toggleSound}
          className="ml-auto text-sm font-bold text-muted hover:text-foreground"
        >
          {soundOn ? "Sound on" : "Sound off"}
        </button>
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

      {view === "dashboard" ? (
        <main className="flex-1 overflow-y-auto bg-background-elevated/40">
          <Dashboard stats={stats} />
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
              leads={leads}
              search={search}
              canCall={canCall}
              onOpen={(lead) => {
                setSelectedId(lead.id);
                setOutcomeFor(null);
              }}
              onMove={(lead, status: StatusId) => patchLead(lead, { status })}
              onCall={dialer.call}
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
            if (patch.status) setOutcomeFor(null);
            return patchLead(selected, patch);
          }}
          onDelete={() => deleteLead(selected)}
          onCall={() => dialer.call(selected)}
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
                  go("free_course_application");
                  setSelectedId(lead.id);
                  setArrived((a) => a.filter((l) => l.id !== lead.id));
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  New free course opt-in
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
