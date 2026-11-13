// The numbers the CRM can graph over time (shared by the server and the UI).

export const TREND_BUCKETS = ["hour", "day", "week", "month"] as const;
export type TrendBucket = (typeof TREND_BUCKETS)[number];

export type TrendList = "all" | "optin" | "dial";

export type TrendKind = "count" | "money" | "percent" | "seconds";

export const TREND_METRICS = [
  { id: "optins", label: "Opt-ins", kind: "count", needs: "applications", seriesOrder: ["Ads", "Organic"] },
  { id: "visitors", label: "Landing page visitors", kind: "count", needs: "applications", ownerOnly: true, seriesOrder: ["Ads", "Organic"] },
  { id: "optin_rate", label: "Opt-in rate", kind: "percent", needs: "applications", ownerOnly: true, seriesOrder: ["Ads", "Organic"] },
  { id: "speed", label: "Avg speed to lead", kind: "seconds", needs: "applications", seriesOrder: ["Ads", "Organic"] },
  { id: "within5", label: "Called within 5 min", kind: "percent", needs: "applications", seriesOrder: ["Ads", "Organic"] },
  { id: "optin_close_rate", label: "Opt-in to close rate", kind: "percent", needs: "applications", seriesOrder: ["Ads", "Organic"] },
  { id: "dials", label: "Dials", kind: "count", byPerson: true, lists: true },
  { id: "leads_called", label: "Different leads called", kind: "count", byPerson: true, lists: true },
  { id: "answer_rate", label: "Answer rate", kind: "percent", byPerson: true, lists: true },
  { id: "booked", label: "Booked appointments", kind: "count", byPerson: true, lists: true },
  { id: "show_rate", label: "Show rate", kind: "percent", byPerson: true, lists: true },
  { id: "closes", label: "Closes", kind: "count", byPerson: true, lists: true, seriesOrder: ["Builder Monthly", "Starter Yearly", "Builder Yearly", "No plan"] },
  { id: "revenue", label: "Cash collected", kind: "money", ownerOnly: true, byPerson: true, lists: true, seriesOrder: ["Builder Monthly", "Starter Yearly", "Builder Yearly", "No plan"] },
  { id: "inbound", label: "Calls from leads", kind: "count", seriesOrder: ["Answered", "Missed", "Other"] },
] as const satisfies readonly {
  id: string;
  label: string;
  kind: TrendKind;
  needs?: "applications";
  ownerOnly?: boolean;
  byPerson?: boolean; // can split into one line per team member
  lists?: boolean; // can be narrowed to opt-ins or dial lists
  seriesOrder?: readonly string[];
}[];

export type TrendMetricId = (typeof TREND_METRICS)[number]["id"];
export type TrendMetric = (typeof TREND_METRICS)[number];

export function isTrendMetric(value: unknown): value is TrendMetricId {
  return TREND_METRICS.some((m) => m.id === value);
}

export function trendMetric(id: TrendMetricId): TrendMetric & {
  ownerOnly?: boolean;
  byPerson?: boolean;
  lists?: boolean;
  needs?: "applications";
  seriesOrder?: readonly string[];
} {
  return TREND_METRICS.find((m) => m.id === id)!;
}

export type TrendResult = {
  metric: TrendMetricId;
  bucket: TrendBucket;
  series: string[];
  // b = bucket start in the viewer's time zone ("2026-11-10T14:00"),
  // s = series, v = value (null when there's nothing to divide by).
  points: { b: string; s: string; v: number | null }[];
};
