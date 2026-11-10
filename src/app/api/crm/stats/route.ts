import { crmRoute } from "@/lib/crm/api";
import { isStatRange, parseWindowTime } from "@/lib/crm/constants";
import { getStats } from "@/lib/crm/leads";

export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    const params = new URL(request.url).searchParams;
    const range = params.get("range");
    return Response.json(
      await getStats(session.access, isStatRange(range) ? range : "30d", session.role === "owner", {
        from: parseWindowTime(params.get("from")),
        to: parseWindowTime(params.get("to")),
      })
    );
  });
}
