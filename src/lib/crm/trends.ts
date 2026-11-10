import "server-only";

import {
  ANSWERED_STATUS_IDS,
  OPT_IN_SOURCES,
  SOURCE_IDS,
  isOptInSource,
  type Access,
} from "./constants";
import { query } from "./db";
import {
  TREND_BUCKETS,
  trendMetric,
  type TrendBucket,
  type TrendList,
  type TrendMetricId,
  type TrendResult,
} from "./trendMetrics";

// Graphs over time for the CRM's numbers: one row per time bucket (hour, day,
// week or month, in the viewer's time zone) and series (Ads / Organic, a plan,
// a person…). Each metric matches how the same number is counted on the
// Dashboard and Analytics tabs.

export type TrendRequest = {
  metric: TrendMetricId;
  from: string | null; // ISO, inclusive
  to: string | null; // ISO, exclusive
  bucket: TrendBucket;
  tz: string;
  actor: string | null; // one person's id, or everyone
  list: TrendList;
  byPerson: boolean;
};

// Parameters every query gets:
// $1 from, $2 to, $3 bucket, $4 time zone, $5 lead lists, $6 person, $7 answered statuses
const bucketOf = (ts: string) =>
  `to_char(date_trunc($3, ${ts} AT TIME ZONE $4), 'YYYY-MM-DD"T"HH24:MI')`;
const inWindow = (ts: string) =>
  `($1::timestamptz IS NULL OR ${ts} >= $1::timestamptz) AND ($2::timestamptz IS NULL OR ${ts} < $2::timestamptz)`;

// Calls and status changes made by the team (not the website or imports).
const teamEvents = (types: string) => `FROM crm_events e JOIN crm_leads l ON l.id = e.lead_id
  WHERE e.type IN (${types}) AND e.actor_id IS NOT NULL
    AND e.actor_id NOT IN ('website', 'webhook', 'manual')
    AND l.source = ANY($5::text[]) AND ($6::text IS NULL OR e.actor_id = $6)
    AND ${inWindow("e.created_at")}`;

const optInLeads = `FROM (SELECT *, coalesce(last_opt_in_at, created_at) AS opt_at FROM crm_leads) l
  WHERE l.source = ANY($5::text[]) AND l.source = ANY('{${OPT_IN_SOURCES.join(",")}}'::text[])
    AND ${inWindow("l.opt_at")}`;

const channel = `CASE WHEN l.source = 'ad_free_course_application' THEN 'Ads' ELSE 'Organic' END`;

const closedLeads = `FROM crm_leads l
  WHERE l.status = 'closed' AND l.source = ANY($5::text[])
    AND ($6::text IS NULL OR l.closed_by_id = $6)
    AND ${inWindow("coalesce(l.closed_at, l.updated_at)")}`;

const planName = `CASE l.close_plan WHEN 'monthly' THEN 'Monthly' WHEN 'yearly' THEN 'Yearly' ELSE 'No plan' END`;

// SQL per metric, returning b (bucket), s (series) and v (value, null = no data).
function sqlFor(metric: TrendMetricId, byPerson: boolean): string {
  const person = (fallback: string) => (byPerson ? `coalesce(max(e.actor_name), 'Unknown')` : `'${fallback}'`);
  const group = byPerson ? `GROUP BY 1, e.actor_id` : `GROUP BY 1`;
  switch (metric) {
    case "optins":
      return `SELECT ${bucketOf("l.opt_at")} AS b, ${channel} AS s, count(*)::float AS v ${optInLeads} GROUP BY 1, 2`;
    case "visitors":
      return `SELECT ${bucketOf("created_at")} AS b, initcap(funnel) AS s, count(DISTINCT visitor_id)::float AS v
        FROM site_events WHERE step = 'view' AND funnel IN ('ads', 'organic') AND ${inWindow("created_at")}
        GROUP BY 1, 2`;
    case "optin_rate":
      return `SELECT ${bucketOf("created_at")} AS b, initcap(funnel) AS s,
          count(DISTINCT visitor_id) FILTER (WHERE step = 'optin')::float
            / nullif(count(DISTINCT visitor_id) FILTER (WHERE step = 'view'), 0) AS v
        FROM site_events WHERE funnel IN ('ads', 'organic') AND ${inWindow("created_at")}
        GROUP BY 1, 2`;
    case "dials":
      return `SELECT ${bucketOf("e.created_at")} AS b, ${person("Dials")} AS s, count(*)::float AS v
        ${teamEvents("'call'")} ${group}`;
    case "leads_called":
      return `SELECT ${bucketOf("e.created_at")} AS b, ${person("Leads called")} AS s, count(DISTINCT e.lead_id)::float AS v
        ${teamEvents("'call'")} ${group}`;
    case "answer_rate":
      return `SELECT ${bucketOf("e.created_at")} AS b, ${person("Answer rate")} AS s,
          count(DISTINCT e.lead_id) FILTER (WHERE l.status = ANY($7::text[]))::float
            / nullif(count(DISTINCT e.lead_id), 0) AS v
        ${teamEvents("'call'")} ${group}`;
    case "booked":
      return `SELECT ${bucketOf("e.created_at")} AS b, ${person("Booked")} AS s, count(DISTINCT e.lead_id)::float AS v
        ${teamEvents("'status'")} AND e.data->>'to' = 'appointment' ${group}`;
    case "show_rate":
      // Of calls booked in the bucket that have happened, how many showed.
      return `SELECT ${bucketOf("e.created_at")} AS b, ${person("Show rate")} AS s,
          (count(DISTINCT e.lead_id) FILTER (WHERE l.status NOT IN ('appointment', 'no_show')))::float
            / nullif(count(DISTINCT e.lead_id) FILTER (WHERE l.status <> 'appointment'), 0) AS v
        ${teamEvents("'status'")} AND e.data->>'to' = 'appointment' ${group}`;
    case "closes":
      return `SELECT ${bucketOf("coalesce(l.closed_at, l.updated_at)")} AS b,
          ${byPerson ? `coalesce(l.closed_by_name, 'Unknown')` : planName} AS s, count(*)::float AS v
        ${closedLeads} GROUP BY 1, 2`;
    case "revenue":
      return `SELECT ${bucketOf("coalesce(l.closed_at, l.updated_at)")} AS b,
          ${byPerson ? `coalesce(l.closed_by_name, 'Unknown')` : planName} AS s,
          coalesce(sum(l.close_amount), 0)::float AS v
        ${closedLeads} GROUP BY 1, 2`;
    case "optin_close_rate":
      return `SELECT ${bucketOf("l.opt_at")} AS b, ${channel} AS s,
          count(*) FILTER (WHERE l.status = 'closed')::float / count(*) AS v
        ${optInLeads} GROUP BY 1, 2`;
    case "speed":
      return `SELECT ${bucketOf("l.opt_at")} AS b, ${channel} AS s,
          avg(extract(epoch FROM l.first_contact_at - l.opt_at)) FILTER (WHERE l.first_contact_at >= l.opt_at)::float AS v
        ${optInLeads} GROUP BY 1, 2`;
    case "within5":
      return `SELECT ${bucketOf("l.opt_at")} AS b, ${channel} AS s,
          count(*) FILTER (WHERE l.first_contact_at - l.opt_at <= interval '5 minutes')::float / count(*) AS v
        ${optInLeads} GROUP BY 1, 2`;
    case "inbound":
      return `SELECT ${bucketOf("c.created_at")} AS b,
          CASE c.status WHEN 'answered' THEN 'Answered' WHEN 'missed' THEN 'Missed' ELSE 'Other' END AS s,
          count(*)::float AS v
        FROM crm_inbound_calls c
        LEFT JOIN crm_leads l ON l.id = c.lead_id
        WHERE (l.id IS NULL OR l.source = ANY($5::text[])) AND ${inWindow("c.created_at")}
        GROUP BY 1, 2`;
  }
}

// Returns null when this person isn't allowed to see the metric.
export async function getTrend(
  access: Access,
  owner: boolean,
  req: TrendRequest
): Promise<TrendResult | null> {
  const def = trendMetric(req.metric);
  if (def.ownerOnly && !owner) return null;
  if (def.needs === "applications" && !access.applications) return null;

  const lists = SOURCE_IDS.filter((s) => (isOptInSource(s) ? access.applications : access.dial))
    .filter((s) => req.list === "all" || (req.list === "optin") === isOptInSource(s)) as string[];
  const byPerson = req.byPerson && Boolean(def.byPerson);
  const bucket = TREND_BUCKETS.includes(req.bucket) ? req.bucket : "day";

  // Declares every parameter's type, so queries that don't use one still run.
  const params = `WITH _params AS (SELECT $1::timestamptz, $2::timestamptz, $3::text, $4::text, $5::text[], $6::text, $7::text[]) `;
  const rows = await query<{ b: string; s: string; v: number | null }>(params + sqlFor(def.id, byPerson), [
    req.from,
    req.to,
    bucket,
    req.tz,
    lists,
    req.actor,
    ANSWERED_STATUS_IDS as unknown as string[],
  ]);

  const series = [...new Set(rows.map((r) => r.s))].sort((a, b) => {
    const order = def.seriesOrder ?? [];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    // People: most first.
    const total = (s: string) => rows.filter((r) => r.s === s).reduce((n, r) => n + (r.v ?? 0), 0);
    return total(b) - total(a);
  });
  return {
    metric: def.id,
    bucket,
    series,
    points: rows.map((r) => ({ b: r.b, s: r.s, v: r.v === null ? null : Number(r.v) })),
  };
}
