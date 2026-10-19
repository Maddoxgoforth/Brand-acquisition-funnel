"use client";

import { useState, type FormEvent } from "react";

import { TIME_ZONES, type Lead } from "@/lib/crm/constants";

export type AppointmentInput = { date: string; time: string; timeZone: string };

const field =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-accent";

// Parts of an ISO moment as seen in a time zone, to prefill when rescheduling.
function partsIn(iso: string, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

// Asked whenever a lead moves into "Appointment scheduled" (or the booked
// time is changed). Cancelling leaves the lead where it was.
export default function AppointmentDialog({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: Lead;
  onCancel: () => void;
  onConfirm: (appointment: AppointmentInput) => Promise<boolean>;
}) {
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startZone = lead.appointmentTz ?? localZone;
  const existing = lead.appointmentAt ? partsIn(lead.appointmentAt, startZone) : null;

  const [time, setTime] = useState(existing?.time ?? "");
  const [timeZone, setTimeZone] = useState(startZone);
  const [date, setDate] = useState(existing?.date ?? "");
  const [busy, setBusy] = useState(false);

  const zones = TIME_ZONES.some((z) => z.id === localZone)
    ? TIME_ZONES
    : [{ id: localZone, label: `Your time zone (${localZone})` }, ...TIME_ZONES];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await onConfirm({ date, time, timeZone });
    if (!ok) setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Appointment scheduled
        </p>
        <h2 className="mt-1 text-xl font-extrabold">
          When are you talking to {lead.name || "this lead"}?
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">
            Time
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={field} autoFocus />
          </label>
          <label className="text-sm font-semibold">
            Time zone
            <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={`${field} text-sm`}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.id === localZone && !zone.label.startsWith("Your") ? `${zone.label} (yours)` : zone.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold">
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={busy || !date || !time}
            className="rounded-full bg-accent px-6 py-2.5 font-bold text-white hover:bg-accent-dim disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save appointment"}
          </button>
          <button type="button" onClick={onCancel} className="px-3 font-bold text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
