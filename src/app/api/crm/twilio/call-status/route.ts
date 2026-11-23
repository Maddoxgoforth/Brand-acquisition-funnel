import { endLiveCall, markLiveCallAnswered } from "@/lib/crm/leads";
import { missingTwilioEnv, readTwilioRequest } from "@/lib/crm/twilio";

// Twilio's status callback for the lead's leg of a call placed from the CRM
// dialer (set on <Number> in ../voice). ParentCallSid is the browser's call,
// which recordCall saved as the lead's live_call_sid:
//   answered  → the lead picked up: show "On a call with NAME"
//   completed → the call ended (or was never answered): clear it
export async function POST(request: Request) {
  if (missingTwilioEnv().length > 0) return new Response("Twilio is not configured", { status: 503 });
  const params = await readTwilioRequest(request);
  if (!params) return new Response("Invalid signature", { status: 403 });

  const sid = params.ParentCallSid || params.CallSid || "";
  try {
    if (sid) {
      if (params.CallStatus === "in-progress") await markLiveCallAnswered(sid);
      else if (["completed", "busy", "no-answer", "canceled", "failed"].includes(params.CallStatus ?? "")) {
        await endLiveCall(sid);
      }
    }
  } catch (error) {
    console.error("CRM call-status webhook failed:", error);
  }
  return new Response(null, { status: 204 });
}
