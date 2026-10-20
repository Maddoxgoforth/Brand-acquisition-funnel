// Shared by the CRM's server code and client UI. Keep this file free of
// server-only imports.

export const SOURCES = [
  {
    id: "free_course_application",
    label: "Free course applications",
    group: "applications",
    description: "Comes in automatically from the free-course lead form.",
  },
  {
    id: "dial_free_course",
    label: "Past free course",
    group: "dial",
    description: "Older free-course leads you add yourself.",
  },
  {
    id: "dial_high_ticket",
    label: "High-ticket mentorship applications",
    group: "dial",
    description: "Past mentorship applicants you add yourself.",
  },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

export const SOURCE_IDS = SOURCES.map((s) => s.id) as readonly SourceId[];

// What a team member is allowed to see. `applications` = the live free-course
// opt-ins; `dial` = the hand-filled lists of past leads. The owner sets these
// per person on the Team tab; the owner always has both.
export type Access = { applications: boolean; dial: boolean };

export const FULL_ACCESS: Access = { applications: true, dial: true };

export function canAccess(access: Access, source: SourceId) {
  const group = SOURCES.find((s) => s.id === source)!.group;
  return access[group];
}

export function isSourceId(value: unknown): value is SourceId {
  return typeof value === "string" && SOURCE_IDS.includes(value as SourceId);
}

// `answered` drives the dashboard's answer rate: a lead in one of these
// columns picked up the phone. "new" means not dialed yet.
export const STATUSES = [
  { id: "new", label: "To dial", answered: false, hint: "Not called yet" },
  {
    id: "no_answer",
    label: "No answer",
    answered: false,
    hint: "Didn't pick up, call again",
  },
  {
    id: "callback",
    label: "Callback",
    answered: true,
    hint: "Picked up, asked for a call back",
  },
  {
    id: "appointment",
    label: "Appointment scheduled",
    answered: true,
    hint: "Booked a time to talk",
  },
  {
    id: "not_interested",
    label: "Not interested",
    answered: true,
    hint: "Picked up and passed for now",
  },
  { id: "closed", label: "Closed", answered: true, hint: "Signed up" },
  {
    id: "do_not_call",
    label: "Do not call",
    answered: true,
    hint: "Never dial again",
  },
] as const;

export type StatusId = (typeof STATUSES)[number]["id"];

export const STATUS_IDS = STATUSES.map((s) => s.id) as readonly StatusId[];

export const ANSWERED_STATUS_IDS = STATUSES.filter((s) => s.answered).map(
  (s) => s.id
) as readonly StatusId[];

export function isStatusId(value: unknown): value is StatusId {
  return typeof value === "string" && STATUS_IDS.includes(value as StatusId);
}

export type Lead = {
  id: string;
  source: SourceId;
  name: string;
  phone: string;
  phoneE164: string | null;
  email: string;
  extra: Record<string, string>;
  status: StatusId;
  notes: string;
  // Set only while the lead is in "Appointment scheduled": the moment of the
  // appointment and the time zone it was booked in (an IANA name like
  // "America/New_York"), so it can be shown the way it was agreed.
  appointmentAt: string | null;
  appointmentTz: string | null;
  callCount: number;
  lastCalledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadEvent = {
  id: number;
  type: "status" | "call" | "created" | "appointment";
  data: Record<string, string>;
  createdAt: string;
};

export type Stats = {
  // null when this person can't see the free-course opt-ins.
  freeCourseOptIns: { day: number; week: number; month: number } | null;
  // Free course applications only: how many ended up in Closed, out of all
  // opt-ins. null when this person can't see the opt-ins.
  optInConversion: { closed: number; total: number; rate: number | null } | null;
  totalLeads: number;
  dialed: number;
  answered: number;
  closed: number;
  // null until at least one lead has been dialed.
  conversionRate: number | null;
  answerRate: number | null;
  bySource: {
    source: SourceId;
    total: number;
    dialed: number;
    answered: number;
    closed: number;
  }[];
};

export const APPOINTMENT_STATUS: StatusId = "appointment";

// Time zones offered when booking an appointment. "Your time zone" (the
// computer's own) is added on top by the booking dialog.
export const TIME_ZONES = [
  { id: "America/New_York", label: "Eastern (New York)" },
  { id: "America/Chicago", label: "Central (Chicago)" },
  { id: "America/Denver", label: "Mountain (Denver)" },
  { id: "America/Phoenix", label: "Arizona (Phoenix)" },
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { id: "America/Anchorage", label: "Alaska" },
  { id: "Pacific/Honolulu", label: "Hawaii" },
  { id: "Europe/London", label: "UK (London)" },
  { id: "Europe/Paris", label: "Central Europe (Paris)" },
  { id: "Africa/Lagos", label: "West Africa (Lagos)" },
  { id: "Africa/Johannesburg", label: "South Africa" },
  { id: "Asia/Dubai", label: "Gulf (Dubai)" },
  { id: "Asia/Kolkata", label: "India" },
  { id: "Asia/Manila", label: "Philippines (Manila)" },
  { id: "Australia/Sydney", label: "Australia (Sydney)" },
];

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Turns a wall-clock date and time in a given time zone ("2026-10-21",
// "15:00", "America/New_York") into the exact moment, handling daylight
// saving. Returns null for anything that isn't a real date/time.
export function zonedTimeToIso(
  date: string,
  time: string,
  timeZone: string
): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  // Some browsers send seconds too ("15:30:00").
  const t = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(time.trim());
  if (!d || !t || !isTimeZone(timeZone)) return null;
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  if (Number.isNaN(wall) || h > 23 || mi > 59) return null;

  // How far the zone is from UTC at a given moment, in milliseconds.
  const offsetAt = (instant: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(instant))
        .map((p) => [p.type, p.value])
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    return asUtc - instant;
  };

  let instant = wall - offsetAt(wall);
  instant = wall - offsetAt(instant);
  return new Date(instant).toISOString();
}

// "Tue, Oct 21, 3:00 PM EDT", shown in the time zone it was booked in.
export function formatAppointment(iso: string, timeZone: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? undefined,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

// Spreadsheet exports often prefix numbers with an apostrophe ('+1555…) to
// force them to text. Strip that and stray quotes before storing or dialing.
export function cleanPhone(raw: string): string {
  return raw.trim().replace(/^['"`\s]+|['"`\s]+$/g, "");
}

// Turns whatever was typed into the +1XXXXXXXXXX form Twilio needs. Assumes
// US/Canada for bare 10-digit numbers. Returns null when it can't be dialed.
export function toE164(raw: string): string | null {
  const trimmed = cleanPhone(raw);
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export type ContactField = "name" | "first" | "last" | "phone" | "email";

// Decides which contact field a column header or form question holds, so
// "What Is your Number?" and "What's the best email to reach you at?" are
// recognized as well as plain "phone" and "email". Returns null for anything
// else, which is kept as extra info.
export function classifyField(header: string): ContactField | null {
  const key = header.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/e ?mail/.test(key)) return "email";
  if (/phone|mobile|\bcell\b|whatsapp|\btel\b/.test(key)) return "phone";
  if (/\bnumber\b/.test(key) && !/number of|order|account|id\b/.test(key)) {
    return "phone";
  }
  if (/^first( name)?$|\bfirst name\b/.test(key)) return "first";
  if (/^last( name)?$|\b(last name|surname)\b/.test(key)) return "last";
  if (/^(full )?name$|\bfull name\b|\byour name\b/.test(key)) return "name";
  return null;
}
