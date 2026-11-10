import { crmRoute } from "@/lib/crm/api";
import { sessionActor } from "@/lib/crm/auth";
import { canAccess } from "@/lib/crm/constants";
import { getLead, markInboundAnswered } from "@/lib/crm/leads";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The browser picked up a lead's call back: credit whoever answered and
// clear the lead's missed-call flag. Body: { leadId, inboundSid }.
export async function POST(request: Request) {
  return crmRoute(request, async (session) => {
    const body = (await request.json().catch(() => null)) as { leadId?: unknown; inboundSid?: unknown } | null;
    const leadId = typeof body?.leadId === "string" && UUID.test(body.leadId) ? body.leadId : null;
    const sid = typeof body?.inboundSid === "string" && /^CA[0-9a-f]{32}$/i.test(body.inboundSid) ? body.inboundSid : null;
    const lead = leadId ? await getLead(leadId) : null;
    if (!lead || !canAccess(session.access, lead.source)) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }
    await markInboundAnswered(sid, lead.id, sessionActor(session));
    return Response.json({ lead: await getLead(lead.id) });
  });
}
