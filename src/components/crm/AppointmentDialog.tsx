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

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

// "15:30" -> { hour: "3", minute: "30", period: "PM" }
function splitTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return {
    hour: String(h % 12 || 12),
    minute: String(m - (m % 5)).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  };
}

// Asked whenever a lead moves into "Appointment scheduled" or "Callback"
// (or that time is changed). Cancelling leaves the lead where it was.
export default function AppointmentDialog({
  lead,
  kind = "appointment",
  onCancel,
  onConfirm,
}: {
  lead: Lead;
  kind?: "appointment" | "callback";
  onCancel: () => void;
  // Resolves to null when saved, or to an error message to show. Called
  // with null for "Save without a time".
  onConfirm: (appointment: AppointmentInput | null) => Promise<string | null>;
}) {
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startZone = lead.appointmentTz ?? localZone;
  const callback = kind === "callback";
  // Prefill only when changing the time of the same kind.
  const existing = lead.appointmentAt && lead.status === kind ? partsIn(lead.appointmentAt, startZone) : null;

  // Plain dropdowns instead of the browser's time box: Safari's time box
  // can reject a half-typed time with "Invalid value" and block saving.
  const start = existing ? splitTime(existing.time) : null;
  const [hour, setHour] = useState(start?.hour ?? "");
  const [minute, setMinute] = useState(start?.minute ?? "00");
  const [period, setPeriod] = useState(start?.period ?? "PM");
  const [timeZone, setTimeZone] = useState(startZone);
  const [date, setDate] = useState(existing?.date ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zones = TIME_ZONES.some((z) => z.id === localZone)
    ? TIME_ZONES
    : [{ id: localZone, label: `Your time zone (${localZone})` }, ...TIME_ZONES];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hour || !date) {
      setError(!hour ? "Pick the hour." : "Pick the date.");
      return;
    }
    const h24 = (Number(hour) % 12) + (period === "PM" ? 12 : 0);
    const time = `${String(h24).padStart(2, "0")}:${minute}`;
    setBusy(true);
    setError(null);
    const problem = await onConfirm({ date, time, timeZone });
    if (problem) {
      setError(problem);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={onCancel}>
      <form
        noValidate
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          {callback ? "Callback" : "Appointment scheduled"}
        </p>
        <h2 className="mt-1 text-xl font-extrabold">
          {callback
            ? `When should you call ${lead.name || "this lead"} back?`
            : `When are you talking to ${lead.name || "this lead"}?`}
        </h2>

        <p className="mt-5 text-sm font-semibold">Time</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <select aria-label="Hour" value={hour} onChange={(e) => setHour(e.target.value)} className={`${field} mt-0`} autoFocus>
            <option value="">Hour</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select aria-label="Minutes" value={minute} onChange={(e) => setMinute(e.target.value)} className={`${field} mt-0`}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>:{m}</option>
            ))}
          </select>
          <select aria-label="AM or PM" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${field} mt-0`}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-semibold">
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

        {error ? (
          <p className="mt-4 text-sm font-semibold text-danger">{error}</p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-6 py-2.5 font-bold text-white hover:bg-accent-dim disabled:opacity-40"
          >
            {busy ? "Saving…" : callback ? "Save callback" : "Save appointment"}
          </button>
          <button type="button" onClick={onCancel} className="px-3 font-bold text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const problem = await onConfirm(null);
            if (problem) {
              setError(problem);
              setBusy(false);
            }
          }}
          className="mt-4 text-sm font-bold text-accent hover:underline disabled:opacity-40"
        >
          {existing ? "Remove the time" : "Save without a time"}
        </button>
      </form>
    </div>
  );
}
