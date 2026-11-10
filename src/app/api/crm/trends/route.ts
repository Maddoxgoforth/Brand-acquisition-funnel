import { crmRoute, noAccess } from "@/lib/crm/api";
import { parseWindowTime } from "@/lib/crm/constants";
import { isTrendMetric, type TrendBucket, type TrendList } from "@/lib/crm/trendMetrics";
import { getTrend } from "@/lib/crm/trends";

// A time zone name the server understands, else Eastern.
function zone(value: string | null) {
  if (!value) return "America/New_York";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "America/New_York";
  }
}

// GET /api/crm/trends?metric=dials&from=…&to=…&bucket=hour&tz=…&actor=…&list=all&split=person
export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    const p = new URL(request.url).searchParams;
    const metric = p.get("metric");
    if (!isTrendMetric(metric)) {
      return Response.json({ error: "Unknown metric" }, { status: 400 });
    }
    const list = p.get("list");
    const result = await getTrend(session.access, session.role === "owner", {
      metric,
      from: parseWindowTime(p.get("from")),
      to: parseWindowTime(p.get("to")),
      bucket: (p.get("bucket") ?? "day") as TrendBucket,
      tz: zone(p.get("tz")),
      actor: p.get("actor") || null,
      list: list === "optin" || list === "dial" ? (list as TrendList) : "all",
      byPerson: p.get("split") === "person",
    });
    return result ? Response.json(result) : noAccess();
  });
}
