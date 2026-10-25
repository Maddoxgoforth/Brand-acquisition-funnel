import { canAccess } from "@/lib/crm/constants";
import { getLead, recordCall } from "@/lib/crm/leads";
import {
  callerFromIdentity,
  escapeXml,
  missingTwilioEnv,
  readTwilioRequest,
} from "@/lib/crm/twilio";
import { getActiveMember } from "@/lib/crm/users";

// Twilio calls this URL (set as the TwiML App's Voice Request URL) the moment
// the browser dialer starts a call, asking "what should I do with it?". We
// answer: dial this lead's number, showing our Twilio number as caller ID.
//
// The browser only sends a lead id. The number to dial always comes from the
// CRM database, so this endpoint can't be used to call arbitrary numbers.

function twiml(body: string, status = 200) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { status, headers: { "Content-Type": "text/xml" } }
  );
}

const say = (message: string) => twiml(`<Say>${escapeXml(message)}</Say>`);

export async function POST(request: Request) {
  if (missingTwilioEnv().length > 0) {
    return new Response("Twilio is not configured", { status: 503 });
  }
  const params = await readTwilioRequest(request);
  if (!params) return new Response("Invalid signature", { status: 403 });

  try {
    const lead = params.LeadId ? await getLead(params.LeadId) : null;
    if (!lead) return say("That lead could not be found.");

    // Only dial leads from lists this caller is allowed to see. The request
    // is already proven to come from Twilio for a signed-in dialer, so if
    // the identity is missing we log it rather than block every call.
    const caller = callerFromIdentity(params.From ?? params.Caller);
    if (!caller) {
      console.error("CRM voice webhook: no dialer identity on the call.");
    } else if (!canAccess(caller.access, lead.source)) {
      return say("That lead could not be found.");
    }
    if (lead.status === "do_not_call") {
      return say("This lead is marked do not call.");
    }
    if (!lead.phoneE164) {
      return say("This lead does not have a valid phone number.");
    }

    // Credit the call to whoever placed it.
    let actor = null;
    if (caller?.actorId === "owner") actor = { id: "owner", name: "Owner" };
    else if (caller?.actorId) {
      const member = await getActiveMember(caller.actorId);
      if (member) actor = { id: member.id, name: member.name };
    }
    await recordCall(lead.id, params.CallSid ?? "", actor);

    return twiml(
      `<Dial callerId="${escapeXml(process.env.TWILIO_PHONE_NUMBER!)}" answerOnBridge="true">` +
        `<Number>${escapeXml(lead.phoneE164)}</Number></Dial>`
    );
  } catch (error) {
    console.error("CRM voice webhook failed:", error);
    return say("Something went wrong placing this call.");
  }
}
