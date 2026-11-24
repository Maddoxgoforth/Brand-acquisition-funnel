import { attachCallRecording } from "@/lib/crm/leads";
import { missingTwilioEnv, readTwilioRequest } from "@/lib/crm/twilio";

// Twilio's recording status callback for calls placed from the CRM dialer
// (record="record-from-answer-dual" on the <Dial> in ../voice). CallSid is the
// dialer's call, which recordCall saved on the lead's "call" event.
export async function POST(request: Request) {
  if (missingTwilioEnv().length > 0) return new Response("Twilio is not configured", { status: 503 });
  const params = await readTwilioRequest(request);
  if (!params) return new Response("Invalid signature", { status: 403 });

  const seconds = Number(params.RecordingDuration ?? 0);
  try {
    if (params.RecordingStatus === "completed" && params.CallSid && params.RecordingSid && seconds >= 1) {
      await attachCallRecording(params.CallSid, params.RecordingSid, seconds);
    }
  } catch (error) {
    console.error("CRM recording webhook failed:", error);
  }
  return new Response(null, { status: 204 });
}
