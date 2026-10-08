import { crmRoute } from "@/lib/crm/api";
import { createVoiceToken, missingTwilioEnv } from "@/lib/crm/twilio";

// Hands the signed-in CRM page a one-hour token so its browser dialer can
// place calls. `missing` lists any Twilio env vars that still need setting.
export async function POST(request: Request) {
  return crmRoute(request, async () => {
    const missing = missingTwilioEnv();
    if (missing.length > 0) {
      return Response.json({ configured: false, missing });
    }
    return Response.json({
      configured: true,
      token: createVoiceToken("crm-dialer"),
    });
  });
}
