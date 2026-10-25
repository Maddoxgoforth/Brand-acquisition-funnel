"use client";

import { useState } from "react";

import type { LeadEvent } from "@/lib/crm/constants";
import { crmFetch, timeAgo } from "./api";

function length(seconds: string | undefined) {
  const s = Number(seconds);
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// One call in a lead's history: who called, the recording, and notes.
export default function CallEntry({
  leadId,
  event,
  onSaved,
}: {
  leadId: string;
  event: LeadEvent;
  onSaved: (events: LeadEvent[]) => void;
}) {
  const [notes, setNotes] = useState(event.data.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (notes === (event.data.notes ?? "")) return;
    setStatus("saving");
    try {
      const data = await crmFetch<{ events: LeadEvent[] }>(
        `/api/crm/leads/${leadId}/calls/${event.id}`,
        { method: "PATCH", body: { notes } }
      );
      onSaved(data.events);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex justify-between gap-3">
        <span className="font-semibold">
          Call{event.actorName ? ` by ${event.actorName}` : ""}
          {event.data.recordingSeconds ? ` · ${length(event.data.recordingSeconds)}` : ""}
        </span>
        <span className="shrink-0 text-muted">{timeAgo(event.createdAt)}</span>
      </div>
      {event.data.recordingSid ? (
        <audio
          controls
          preload="none"
          src={`/api/crm/recordings/${event.data.recordingSid}`}
          className="h-9 w-full"
        />
      ) : (
        <p className="text-xs text-muted">
          No recording (not answered, or still processing; give it a minute).
        </p>
      )}
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setStatus("idle");
        }}
        onBlur={save}
        placeholder="Notes on this call…"
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {status === "saving" ? <p className="text-xs text-muted">Saving…</p> : null}
      {status === "saved" ? <p className="text-xs text-muted">Saved</p> : null}
      {status === "error" ? <p className="text-xs text-danger">Couldn&apos;t save. Try again.</p> : null}
    </li>
  );
}
