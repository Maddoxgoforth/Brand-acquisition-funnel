import { crmRoute } from "@/lib/crm/api";
import { latestRawEvent, listPartnersForOwner } from "@/lib/crm/partners";

// Owner only: every Mad Media partner with totals, the latest webhook events
// (all subids, the owner's own included) and the newest raw event body.
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const data = await listPartnersForOwner();
      return Response.json({ ...data, latestRaw: await latestRawEvent(), webhookReady: Boolean(process.env.PARTNER_WEBHOOK_KEY) });
    },
    { ownerOnly: true }
  );
}
