import { getLead, recordCall } from "@/lib/crm/leads";
import {
  escapeXml,
  isValidTwilioSignature,
  missingTwilioEnv,
} from "@/lib/crm/twilio";

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

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  // Twilio signs the public URL it requested, so rebuild that (not the
  // internal one the platform proxied to).
  const requestUrl = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    requestUrl.host;
  const publicUrl = `${proto}://${host}${requestUrl.pathname}${requestUrl.search}`;

  if (
    !isValidTwilioSignature(
      publicUrl,
      params,
      request.headers.get("x-twilio-signature")
    )
  ) {
    return new Response("Invalid signature", { status: 403 });
  }

  try {
    const lead = params.LeadId ? await getLead(params.LeadId) : null;
    if (!lead) return say("That lead could not be found.");
    if (lead.status === "do_not_call") {
      return say("This lead is marked do not call.");
    }
    if (!lead.phoneE164) {
      return say("This lead does not have a valid phone number.");
    }

    await recordCall(lead.id, params.CallSid ?? "");

    return twiml(
      `<Dial callerId="${escapeXml(
        process.env.TWILIO_PHONE_NUMBER!
      )}" answerOnBridge="true"><Number>${escapeXml(
        lead.phoneE164
      )}</Number></Dial>`
    );
  } catch (error) {
    console.error("CRM voice webhook failed:", error);
    return say("Something went wrong placing this call.");
  }
}
