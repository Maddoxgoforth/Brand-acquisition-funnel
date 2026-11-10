import { crmRoute } from "@/lib/crm/api";
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
    const account = process.env.TWILIO_ACCOUNT_SID ?? "";
    const auth = Buffer.from(`${account}:${process.env.TWILIO_AUTH_TOKEN ?? ""}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Recordings/${sid}.mp3`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return Response.json({ error: "Couldn't load the voicemail" }, { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" },
    });
  });
}
