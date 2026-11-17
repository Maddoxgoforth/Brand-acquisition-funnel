import { crmRoute } from "@/lib/crm/api";
import { myPay } from "@/lib/crm/pay";

// A team member's own commissions, payouts and balance. The owner has no
// pay of their own (their closes never earn commission).
export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    if (session.role !== "member") return Response.json({ error: "Team members only" }, { status: 400 });
    return Response.json(await myPay(session.userId), { headers: { "Cache-Control": "no-store" } });
  });
}
