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
  callCount: number;
  lastCalledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadEvent = {
  id: number;
  type: "status" | "call" | "created";
  data: Record<string, string>;
  createdAt: string;
};

export type Stats = {
  freeCourseOptIns: { day: number; week: number; month: number };
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
