import { crmRoute } from "@/lib/crm/api";
import { isStatRange } from "@/lib/crm/constants";
import { getStats } from "@/lib/crm/leads";

export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    const range = new URL(request.url).searchParams.get("range");
    return Response.json(
      await getStats(session.access, isStatRange(range) ? range : "30d", session.role === "owner")
    );
  });
}
