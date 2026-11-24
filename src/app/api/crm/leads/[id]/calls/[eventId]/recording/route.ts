import { crmRoute } from "@/lib/crm/api";
import { twilioRecordingResponse } from "@/lib/crm/twilio";
import { canAccess } from "@/lib/crm/constants";
import { callRecordingSid, getLead } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string; eventId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The recording of one call in a lead's history. Fetched from Twilio with the
// account's credentials, so it never needs a public link.
export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id, eventId } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    if (!lead || !canAccess(session.access, lead.source) || !/^\d+$/.test(eventId)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const sid = await callRecordingSid(id, Number(eventId));
    if (!sid || !/^RE[0-9a-f]{32}$/i.test(sid)) return Response.json({ error: "No recording" }, { status: 404 });
    return twilioRecordingResponse(request, sid);
  });
}
