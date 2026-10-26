// Shared by the CRM's server code and client UI. Keep this file free of
// server-only imports.

export const SOURCES = [
  {
    id: "free_course_application",
    label: "Organic opt-ins",
    group: "applications",
    description:
      "Free course opt-ins from the main page (link in bio, posts): organic traffic.",
  },
  {
    id: "ad_free_course_application",
    label: "Ad opt-ins",
    group: "applications",
    description:
      "Free course opt-ins from the ad funnel (/free-training quiz + video): cold traffic.",
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

// The live opt-in lists (organic and ads). They fill themselves from the
// website, show newest first, and re-opt-ins go back to To dial.
export const OPT_IN_SOURCES = ["free_course_application", "ad_free_course_application"] as const;

export function isOptInSource(source: SourceId) {
  return (OPT_IN_SOURCES as readonly string[]).includes(source);
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
  // Optional link to a recording of the closing call, added on closed leads.
  recordingUrl: string | null;
  // First call or first move out of To dial (speed to lead). null = waiting.
  firstContactAt: string | null;
  // Free course applications: how many times they've opted in, and when the
  // latest one was (= createdAt for a first opt-in).
  optInCount: number;
  lastOptInAt: string;
  // Where an opt-in came from: utm_source / utm_campaign / utm_content (the
  // ad) etc. and the landing page. Browser ids and IP stay on the server.
  attribution: Record<string, string>;
  callCount: number;
  lastCalledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Who made a change: "owner", a team member's account id, or "website" /
// "webhook" for leads that arrived on their own.
export type Actor = { id: string; name: string };

export type LeadEvent = {
  id: number;
  type: "status" | "call" | "created" | "appointment" | "reoptin";
  // For calls: callSid and, once added, notes.
  data: Record<string, string>;
  actorName: string | null;
  createdAt: string;
};

export type LeaderboardRow = {
  actorId: string;
  name: string;
  dials: number;
  leadsCalled: number;
  answered: number;
  closes: number;
  answerRate: number | null;
};

// Time frames the dashboard can switch between.
export const STAT_RANGES = [
  { id: "1d", label: "1 day", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "3 months", days: 90 },
  { id: "180d", label: "6 months", days: 180 },
  { id: "365d", label: "1 year", days: 365 },
  { id: "all", label: "Lifetime", days: null },
] as const;

export type StatRange = (typeof STAT_RANGES)[number]["id"];

export function isStatRange(value: unknown): value is StatRange {
  return STAT_RANGES.some((r) => r.id === value);
}

export type FunnelNumbers = {
  dialed: number;
  answered: number;
  closed: number;
  // null until something has been dialed (or, for opt-ins, came in).
  answerRate: number | null;
  conversionRate: number | null;
};

export type OptInChannel = FunnelNumbers & {
  source: SourceId;
  label: string;
  // Opt-ins that came in during the range.
  total: number;
  // Unique visitors to that funnel's landing page during the range, and
  // opt-ins ÷ visitors. null before page tracking has any visits.
  visitors: number | null;
  optInRate: number | null;
  // Of these opt-ins: booked a call (Appointment scheduled, or already
  // Closed) and booked ÷ opt-ins.
  booked: number;
  bookRate: number | null;
  // Speed to lead for opt-ins in the range.
  contacted: number;
  within5: number; // contacted within 5 minutes of opting in
  waiting: number; // not contacted yet
  avgFirstContactSeconds: number | null;
  medianFirstContactSeconds: number | null;
};

export type FunnelStep = { step: string; label: string; visitors: number };

export type CampaignRow = {
  campaign: string;
  ad: string;
  optIns: number;
  booked: number;
  closed: number;
};

export type Stats = {
  range: StatRange;
  // Calls and closes per team member during the range (lists this viewer
  // can see only).
  leaderboard: LeaderboardRow[];
  // Free course opt-ins, organic and ads side by side: the opt-ins that came
  // in during the range and what has happened to them since. null when this
  // person can't see the opt-ins.
  optIns: { channels: OptInChannel[]; total: OptInChannel } | null;
  // Ad funnel drop-off: unique visitors reaching each step during the range.
  adFunnel: FunnelStep[] | null;
  // Ad opt-ins by campaign / ad (utm_campaign / utm_content).
  campaigns: CampaignRow[] | null;
  // The hand-filled dial lists: calling activity during the range.
  // null when this person can't see the dial lists.
  dial:
    | (FunnelNumbers & {
        leadsInLists: number;
        toDial: number;
        bySource: ({
          source: SourceId;
          total: number;
          toDial: number;
        } & FunnelNumbers)[];
      })
    | null;
};

// Page-tracking steps of each funnel, in order (see /api/track).
export const FUNNEL_STEPS = {
  ads: [
    { step: "view", label: "Landed on the quiz page" },
    { step: "quiz_start", label: "Started the quiz" },
    { step: "quiz_done", label: "Finished the quiz" },
    { step: "vsl_view", label: "Opened the video page" },
    { step: "vsl_unlocked", label: "Watched until the button unlocked" },
    { step: "form_open", label: "Opened the opt-in form" },
    { step: "optin", label: "Opted in" },
  ],
  organic: [
    { step: "view", label: "Landed on the free course page" },
    { step: "form_open", label: "Opened the opt-in form" },
    { step: "optin", label: "Opted in" },
  ],
} as const;

export type FunnelId = keyof typeof FUNNEL_STEPS;

export function isTrackedStep(funnel: unknown, step: unknown): funnel is FunnelId {
  return (
    (funnel === "ads" || funnel === "organic") &&
    FUNNEL_STEPS[funnel].some((s) => s.step === step)
  );
}

// The confirmation page promises a call within 5 minutes.
export const SPEED_TO_LEAD_SECONDS = 5 * 60;

// "45s", "4m 12s", "2h 05m", "3d 4h"
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

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
