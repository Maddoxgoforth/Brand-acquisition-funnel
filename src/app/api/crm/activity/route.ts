import { crmRoute } from "@/lib/crm/api";
import { memberActivity } from "@/lib/crm/pay";
import { readRange } from "../pay/range";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Owner only: everything one team member did in a time frame.
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const member = new URL(request.url).searchParams.get("member");
      const range = readRange(request.url);
      if (!member || !UUID.test(member) || !range) {
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }
      return Response.json({ items: await memberActivity(member, range.from, range.to) });
    },
    { ownerOnly: true }
  );
}
