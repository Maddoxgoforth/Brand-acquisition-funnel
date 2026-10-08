"use client";

import { useMemo, useState, type DragEvent } from "react";

import { STATUSES, type Lead, type StatusId } from "@/lib/crm/constants";
import { timeAgo } from "./api";

const PAGE = 50;

const COLUMN_ACCENT: Record<StatusId, string> = {
  new: "bg-slate-400",
  no_answer: "bg-amber-400",
  callback: "bg-sky-500",
  not_interested: "bg-slate-500",
  closed: "bg-emerald-500",
  do_not_call: "bg-red-500",
};

function matches(lead: Lead, needle: string) {
  if (!needle) return true;
  const haystack = [
    lead.name,
    lead.phone,
    lead.email,
    lead.notes,
    ...Object.values(lead.extra),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function Board({
  leads,
  search,
  onOpen,
  onMove,
  onCall,
  canCall,
}: {
  leads: Lead[];
  search: string;
  onOpen: (lead: Lead) => void;
  onMove: (lead: Lead, status: StatusId) => void;
  onCall: (lead: Lead) => void;
  canCall: boolean;
}) {
  const [dragOver, setDragOver] = useState<StatusId | null>(null);
  const [limits, setLimits] = useState<Partial<Record<StatusId, number>>>({});

  const columns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const grouped = Object.fromEntries(
      STATUSES.map((s) => [s.id, [] as Lead[]])
    ) as Record<StatusId, Lead[]>;
    for (const lead of leads) {
      if (matches(lead, needle)) grouped[lead.status].push(lead);
    }
    // Untouched leads stay newest-first; worked leads show most recently
    // touched first.
    for (const status of STATUSES) {
      if (status.id !== "new") {
        grouped[status.id].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
    }
    return grouped;
  }, [leads, search]);

  function handleDrop(event: DragEvent, status: StatusId) {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/lead-id");
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.status !== status) onMove(lead, status);
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 pb-6">
      {STATUSES.map((status) => {
        const items = columns[status.id];
        const limit = limits[status.id] ?? PAGE;
        return (
          <section
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(status.id);
            }}
            onDragLeave={() => setDragOver((s) => (s === status.id ? null : s))}
            onDrop={(event) => handleDrop(event, status.id)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-background-elevated transition-colors ${
              dragOver === status.id ? "border-accent" : "border-border"
            }`}
          >
            <header className="px-4 pb-2 pt-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_ACCENT[status.id]}`} />
                <h3 className="font-extrabold">{status.label}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-bold tabular-nums text-muted">
                  {items.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{status.hint}</p>
            </header>

            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
              {items.slice(0, limit).map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/lead-id", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onOpen(lead)}
                  className="cursor-grab rounded-xl border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  <p className="truncate font-bold">{lead.name || "No name"}</p>
                  <p className="truncate text-sm tabular-nums text-muted">
                    {lead.phone || "No phone"}
                  </p>
                  {lead.email ? (
                    <p className="truncate text-xs text-muted">{lead.email}</p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span>
                      {lead.callCount > 0
                        ? `${lead.callCount} call${lead.callCount === 1 ? "" : "s"}`
                        : `Added ${timeAgo(lead.createdAt)}`}
                    </span>
                    {status.id !== "do_not_call" && lead.phoneE164 ? (
                      <button
                        type="button"
                        disabled={!canCall}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCall(lead);
                        }}
                        className="ml-auto rounded-full bg-accent px-3 py-1 font-bold text-white transition-colors hover:bg-accent-dim disabled:opacity-40"
                      >
                        Call
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}

              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted">
                  Drag a lead here
                </p>
              ) : null}

              {items.length > limit ? (
                <button
                  type="button"
                  onClick={() =>
                    setLimits((l) => ({ ...l, [status.id]: limit + PAGE * 2 }))
                  }
                  className="rounded-lg py-2 text-xs font-bold text-accent hover:underline"
                >
                  Show more ({items.length - limit} hidden)
                </button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
