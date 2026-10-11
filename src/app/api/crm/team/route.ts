import { crmRoute } from "@/lib/crm/api";
import { listTeam } from "@/lib/crm/users";

// Owner only: every account, with pending requests first.
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => Response.json({ team: await listTeam() }),
    { ownerOnly: true }
  );
}
