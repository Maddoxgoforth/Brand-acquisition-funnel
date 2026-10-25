import { attachRecording } from "@/lib/crm/leads";
import { readTwilioRequest } from "@/lib/crm/twilio";

// Twilio calls this when a call recording is ready. The recording stays in
// Twilio; we store its id on the call so the CRM can play it back.
export async function POST(request: Request) {
  const params = await readTwilioRequest(request);
  if (!params) return new Response("Invalid signature", { status: 403 });
  if (params.RecordingStatus && params.RecordingStatus !== "completed") {
    return new Response(null, { status: 204 });
  }
  try {
    const matched = await attachRecording(
      params.CallSid ?? "",
      params.RecordingSid ?? "",
      params.RecordingDuration ?? ""
    );
    if (!matched) console.error("Recording callback: no call found for", params.CallSid);
  } catch (error) {
    console.error("Recording callback failed:", error);
  }
  return new Response(null, { status: 204 });
}
