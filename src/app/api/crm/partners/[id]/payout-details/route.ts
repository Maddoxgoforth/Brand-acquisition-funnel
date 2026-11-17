import { crmRoute } from "@/lib/crm/api";
import { payoutFull } from "@/lib/crm/payoutDetails";

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Owner only: a partner's full bank details, to send them a payout.
export async function GET(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
      const details = await payoutFull(id);
      if (details === "not_configured") return Response.json({ error: "Add PARTNER_PAYOUT_KEY in Vercel to read payout details." }, { status: 503 });
      if (!details) return Response.json({ error: "No payout details yet" }, { status: 404 });
      return Response.json({ details }, { headers: { "Cache-Control": "no-store" } });
    },
    { ownerOnly: true }
  );
}
