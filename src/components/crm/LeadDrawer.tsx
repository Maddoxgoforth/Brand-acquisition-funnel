"use client";

import { useEffect, useState } from "react";

import {
  SOURCES,
  STATUSES,
  type Lead,
  type LeadEvent,
  type StatusId,
} from "@/lib/crm/constants";
import { crmFetch, timeAgo } from "./api";

export type LeadPatch = Partial<
  Pick<Lead, "name" | "phone" | "email" | "notes" | "status" | "extra">
>;

const field =
  "w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-accent";

const statusLabel = (id: string) =>
  STATUSES.find((s) => s.id === id)?.label ?? id;

function describe(event: LeadEvent) {
  if (event.type === "call") return "Called from the CRM";
  if (event.type === "status") {
    return `Moved from ${statusLabel(event.data.from)} to ${statusLabel(event.data.to)}`;
  }
  return `Added (${event.data.via ?? "manual"})`;
}

// Render with key={lead.id} so the form resets when a different lead opens.
export default function LeadDrawer({
  lead,
  askOutcome,
  canCall,
  onClose,
  onSave,
  onDelete,
  onCall,
}: {
  lead: Lead;
  askOutcome: boolean;
  canCall: boolean;
  onClose: () => void;
  onSave: (patch: LeadPatch) => Promise<LeadEvent[] | null>;
  onDelete: () => void;
  onCall: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email);
  const [notes, setNotes] = useState(lead.notes);
  const [events, setEvents] = useState<LeadEvent[] | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    crmFetch<{ events: LeadEvent[] }>(`/api/crm/leads/${lead.id}`)
      .then((data) => {
        if (!cancelled) setEvents(data.events);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
    // Refetch when the lead changes underneath us (status move, new call).
  }, [lead.id, lead.updatedAt, lead.callCount]);

  async function save(patch: LeadPatch) {
    const next = await onSave(patch);
    if (next) setEvents(next);
  }

  function saveIfChanged(key: "name" | "phone" | "email" | "notes", value: string) {
    if (value !== lead[key]) save({ [key]: value });
  }

  function setExtra(key: string, value: string | null) {
    const extra = { ...lead.extra };
    if (value === null || value.trim() === "") delete extra[key];
    else extra[key] = value;
    save({ extra });
  }

  const list = SOURCES.find((s) => s.id === lead.source);
  const extraEntries = Object.entries(lead.extra);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              {list?.label}
            </p>
            <h2 className="mt-1 truncate text-xl font-extrabold">
              {lead.name || "No name"}
            </h2>
            <p className="text-xs text-muted">Added {timeAgo(lead.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-3 py-1 text-xl text-muted hover:bg-background-elevated"
          >
            ×
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {askOutcome ? (
            <p className="rounded-xl bg-background-elevated px-4 py-3 text-sm font-semibold">
              Call ended. How did it go? Pick where this lead belongs below.
            </p>
          ) : null}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Status
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() =>
                    status.id !== lead.status && save({ status: status.id as StatusId })
                  }
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    status.id === lead.status
                      ? "border-accent bg-accent text-white"
                      : "border-border hover:border-accent"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Contact
            </h3>
            <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => saveIfChanged("name", name)} />
            <div className="flex gap-2">
              <input className={field} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => saveIfChanged("phone", phone)} />
              <button
                type="button"
                onClick={onCall}
                disabled={!canCall || !lead.phoneE164 || lead.status === "do_not_call"}
                className="shrink-0 rounded-full bg-accent px-5 font-bold text-white transition-colors hover:bg-accent-dim disabled:opacity-40"
              >
                Call
              </button>
            </div>
            {lead.phone && !lead.phoneE164 ? (
              <p className="text-xs text-danger">
                This number can&apos;t be dialed as written. Use a 10-digit US number or
                start with + and the country code.
              </p>
            ) : null}
            {lead.status === "do_not_call" ? (
              <p className="text-xs text-danger">Marked do not call. Calling is blocked.</p>
            ) : null}
            <input className={field} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => saveIfChanged("email", email)} />
            <p className="text-xs text-muted">
              {lead.callCount} call{lead.callCount === 1 ? "" : "s"} from the CRM
              {lead.lastCalledAt ? `, last ${timeAgo(lead.lastCalledAt)}` : ""}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Notes
            </h3>
            <textarea
              className={`${field} mt-2 h-28`}
              placeholder="What happened on the call, when to call back…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => saveIfChanged("notes", notes)}
            />
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Other info
            </h3>
            <div className="mt-2 space-y-2">
              {extraEntries.length === 0 ? (
                <p className="text-sm text-muted">Nothing extra saved for this lead.</p>
              ) : null}
              {extraEntries.map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted">{key}</p>
                    <textarea
                      className={`${field} mt-1 text-sm`}
                      rows={Math.min(4, Math.ceil(value.length / 40) || 1)}
                      defaultValue={value}
                      onBlur={(e) => e.target.value !== value && setExtra(key, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtra(key, null)}
                    aria-label={`Remove ${key}`}
                    className="mt-6 rounded-full px-2 text-muted hover:text-danger"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input className={`${field} text-sm`} placeholder="Field name" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                <input className={`${field} text-sm`} placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                <button
                  type="button"
                  disabled={!newKey.trim() || !newValue.trim()}
                  onClick={() => {
                    setExtra(newKey.trim(), newValue);
                    setNewKey("");
                    setNewValue("");
                  }}
                  className="shrink-0 rounded-lg border border-border px-3 text-sm font-bold hover:border-accent disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              History
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {events === null ? <li className="text-muted">Loading…</li> : null}
              {events?.map((event) => (
                <li key={event.id} className="flex justify-between gap-3">
                  <span>{describe(event)}</span>
                  <span className="shrink-0 text-muted">{timeAgo(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this lead for good? This can't be undone.")) onDelete();
            }}
            className="text-sm font-bold text-danger hover:underline"
          >
            Delete lead
          </button>
        </div>
      </aside>
    </div>
  );
}
