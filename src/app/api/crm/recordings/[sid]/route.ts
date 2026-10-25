import { crmRoute, noAccess } from "@/lib/crm/api";
import { canAccess } from "@/lib/crm/constants";
import { getRecordingLead } from "@/lib/crm/leads";

type Context = { params: Promise<{ sid: string }> };

// Streams a call recording from Twilio to a signed-in CRM user who can see
// that lead. Twilio needs our account credentials to serve recordings, so the
// browser can't fetch them directly. Passes Range through so the player can
// seek (Safari requires this).
export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { sid } = await params;
    if (!/^RE[0-9a-f]{32}$/i.test(sid)) {
      return Response.json({ error: "Recording not found" }, { status: 404 });
    }
    const lead = await getRecordingLead(sid);
    if (!lead) return Response.json({ error: "Recording not found" }, { status: 404 });
    if (!canAccess(session.access, lead.source)) return noAccess();

    const account = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(`${account}:${process.env.TWILIO_AUTH_TOKEN!}`).toString("base64");
    const range = request.headers.get("range");
    const upstream = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${account}/Recordings/${sid}.mp3`,
      { headers: { Authorization: `Basic ${auth}`, ...(range ? { Range: range } : {}) } }
    );
    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ error: "Recording unavailable" }, { status: 502 });
    }
    const headers = new Headers({ "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" });
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  });
}
