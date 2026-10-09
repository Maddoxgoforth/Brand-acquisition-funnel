import { crmRoute } from "@/lib/crm/api";
import { repairContactFields } from "@/lib/crm/leads";

// Moves phone / email / name values that an earlier import left under a
// lead's extra info into the real fields. The board calls this by itself
// when it spots leads in that state.
export async function POST(request: Request) {
  return crmRoute(request, async () =>
    Response.json({ fixed: await repairContactFields() })
  );
}
