"use client";

import { useMemo, useState, type DragEvent } from "react";

import {
  CUSTOMER_STATUSES,
  busyWithSomeoneElse,
  formatAppointment,
  planLabel,
  type CustomerStatusId,
  type Lead,
} from "@/lib/crm/constants";
import { timeAgo } from "./api";
import LiveCallBadge from "./LiveCallBadge";

// Customers board (owner, Nov 24 2026): upsells after the Base44 sale.
// Closed leads land in "Closed · Base44" owned by their closer, move
// themselves to Check-in 7 days later (Slack + Discord ping), and Not
// interested comes back to Check-in after 14 days.
const ACCENT: Record<CustomerStatusId, string> = {
  base44: "bg-emerald-500",
  checkin: "bg-sky-500",
  no_answer: "bg-amber-400",
  mid_call: "bg-violet-400",
  high_call: "bg-violet-600",
  mid_closed: "bg-emerald-600",
  high_closed: "bg-amber-500",
  not_interested: "bg-slate-500",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function matches(lead: Lead, needle: string) {
  if (!needle) return true;
  return [lead.name, lead.phone, lead.email, lead.notes, lead.claimedByName ?? "", ...Object.values(lead.extra)]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export default function Customers({
  leads,
  me,
  canCall,
  onlyMine,
  search,
  onOpen,
  onMove,
  onCall,
}: {
  leads: Lead[] | null;
  me: string;
  canCall: boolean;
  onlyMine: boolean;
  search: string;
  onOpen: (lead: Lead) => void;
  onMove: (lead: Lead, status: CustomerStatusId) => void;
  onCall: (lead: Lead) => void;
}) {
  const [dragOver, setDragOver] = useState<CustomerStatusId | null>(null);

  const columns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const grouped = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s.id, [] as Lead[]])) as Record<
      CustomerStatusId,
      Lead[]
    >;
    for (const lead of leads ?? []) {
      if (!lead.customerStatus || !matches(lead, needle)) continue;
      if (onlyMine && lead.claimedById !== me) continue;
      grouped[lead.customerStatus].push(lead);
    }
    for (const id of Object.keys(grouped) as CustomerStatusId[]) {
      grouped[id].sort((a, b) =>
        id === "base44" || id === "not_interested"
          ? (a.customerNextAt ?? "").localeCompare(b.customerNextAt ?? "")
          : (b.customerMovedAt ?? "").localeCompare(a.customerMovedAt ?? "")
      );
    }
    return grouped;
  }, [leads, search, onlyMine, me]);

  if (!leads) return <p className="px-6 text-muted">Loading customers…</p>;

  function handleDrop(event: DragEvent, status: CustomerStatusId) {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/lead-id");
    const lead = leads?.find((l) => l.id === id);
    if (lead && lead.customerStatus !== status) onMove(lead, status);
  }

  return (
    <div className="grid min-h-0 flex-1 auto-rows-[32rem] grid-cols-2 gap-3 overflow-y-auto px-6 pb-6 md:grid-cols-4 xl:auto-rows-[calc(100vh-10rem)]">
      {CUSTOMER_STATUSES.map((status) => {
        const items = columns[status.id];
        return (
          <section
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(status.id);
            }}
            onDragLeave={() => setDragOver((s) => (s === status.id ? null : s))}
            onDrop={(event) => handleDrop(event, status.id)}
            className={`flex min-h-0 min-w-0 flex-col rounded-2xl border bg-background-elevated transition-colors ${
              dragOver === status.id ? "border-accent" : "border-border"
            }`}
          >
            <header className="px-3 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ACCENT[status.id]}`} />
                <h3 className="truncate font-extrabold">{status.label}</h3>
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-bold tabular-nums text-muted">
                  {items.length}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted" title={status.hint}>
                {status.hint}
              </p>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
              {items.map((lead) => (
                <article
                  key={lead.id}
                  draggable={!busyWithSomeoneElse(lead, me)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/lead-id", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onOpen(lead)}
                  className="cursor-grab rounded-lg border border-border bg-background px-2.5 py-2 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  <LiveCallBadge lead={lead} me={me} className="mb-1" />
                  <p className="truncate text-sm font-bold leading-tight">{lead.name || "No name"}</p>
                  <p className="truncate text-xs leading-tight tabular-nums text-muted">{lead.phone || "No phone"}</p>
                  <p className="mt-0.5 mr-1 inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    Base44 · {planLabel(lead.closePlan)}
                    {lead.closedAt ? ` · ${day(lead.closedAt)}` : ""}
                  </p>
                  {lead.claimedByName ? (
                    <p
                      className={`mt-0.5 mr-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                        lead.claimedById === me ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      👤 {lead.claimedById === me ? "You" : lead.claimedByName}
                    </p>
                  ) : null}
                  {Object.keys(lead.customerNotes).length ? (
                    <p className="mt-0.5 mr-1 inline-block rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                      📝 Check-in notes{lead.customerNotes.fit ? ` · ${lead.customerNotes.fit.slice(0, 30)}` : ""}
                    </p>
                  ) : null}
                  {lead.customerNextAt && (status.id === "base44" || status.id === "not_interested") ? (
                    <p className="mt-0.5 truncate rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-800">
                      📞 Check-in {formatAppointment(lead.customerNextAt, null)}
                    </p>
                  ) : null}
                  {lead.missedCallAt ? (
                    <p className="mt-0.5 mr-1 inline-block rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-extrabold text-red-700">
                      📞 Missed call {timeAgo(lead.missedCallAt)}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span>
                      {lead.customerMovedAt ? `Here ${timeAgo(lead.customerMovedAt)}` : ""}
                      {lead.lastCalledAt ? ` · called ${timeAgo(lead.lastCalledAt)}` : ""}
                    </span>
                    {lead.phoneE164 && !lead.blockedAt ? (
                      <button
                        type="button"
                        disabled={!canCall}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCall(lead);
                        }}
                        className="ml-auto rounded-full bg-accent px-2.5 py-0.5 font-bold text-white transition-colors hover:bg-accent-dim disabled:opacity-40"
                      >
                        Call
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {items.length === 0 ? <p className="px-1 py-4 text-center text-xs text-muted">Drag a customer here</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
