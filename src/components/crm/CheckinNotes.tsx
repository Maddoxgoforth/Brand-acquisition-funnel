"use client";

import { useState } from "react";

import { CHECKIN_NOTE_FIELDS, type Lead } from "@/lib/crm/constants";
import { crmFetch } from "./api";

// Check-in notes on a customer's lead card (owner, Nov 24 2026): the answers
// from the 7-day check-in call, so whoever runs the Google Meet strategy call
// walks in knowing the customer's situation. Each field saves when you leave it.
export default function CheckinNotes({
  lead,
  onSaved,
  onError,
}: {
  lead: Lead;
  onSaved: (lead: Lead) => void;
  onError: (e: unknown) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(lead.customerNotes);
  const [saving, setSaving] = useState<string | null>(null);
  const filled = CHECKIN_NOTE_FIELDS.filter((f) => (lead.customerNotes[f.id] ?? "").trim()).length;

  async function save(id: string) {
    const value = values[id] ?? "";
    if (value.trim() === (lead.customerNotes[id] ?? "")) return;
    setSaving(id);
    try {
      const data = await crmFetch<{ lead: Lead }>("/api/crm/customers", {
        method: "POST",
        body: { id: lead.id, notes: { [id]: value } },
      });
      onSaved(data.lead);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">📝 Check-in notes</h3>
        <span className="ml-auto text-xs text-muted">
          {filled}/{CHECKIN_NOTE_FIELDS.length} filled{saving ? " · saving…" : ""}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Fill these in on the 7-day check-in call. Read them before the Google Meet strategy call.
      </p>
      <div className="mt-3 space-y-3">
        {CHECKIN_NOTE_FIELDS.map((f) => (
          <label key={f.id} className="block">
            <span className="text-xs font-bold">{f.label}</span>
            <textarea
              rows={f.id === "hours" || f.id === "format" || f.id === "meet" ? 1 : 2}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder={f.placeholder}
              value={values[f.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              onBlur={() => save(f.id)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
