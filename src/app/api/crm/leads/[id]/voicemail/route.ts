import { crmRoute } from "@/lib/crm/api";
import { twilioRecordingResponse } from "@/lib/crm/twilio";
import { canAccess } from "@/lib/crm/constants";
import { getLead, voicemailSidFor } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The voicemail a lead left when their call back was missed. Fetched from
// Twilio with the account's credentials, so the recording never needs a
// public link.
export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    const sid = lead && canAccess(session.access, lead.source) ? await voicemailSidFor(id) : null;
    if (!sid || !/^RE[0-9a-f]{32}$/i.test(sid)) return Response.json({ error: "No voicemail" }, { status: 404 });
    return twilioRecordingResponse(request, sid);
  });
}
