import { crmRoute } from "@/lib/crm/api";
import { getStats } from "@/lib/crm/leads";

export async function GET(request: Request) {
  return crmRoute(request, async () => Response.json(await getStats()));
}
