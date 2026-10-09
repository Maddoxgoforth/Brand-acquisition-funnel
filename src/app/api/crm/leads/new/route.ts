import { crmRoute } from "@/lib/crm/api";
import { listNewApplications } from "@/lib/crm/leads";

// Polled by the open CRM page every few seconds so new free-course opt-ins
// appear (and chime) without a refresh. Pass back the `cursor` from the last
// response as ?since=; the first call (no since) just returns a cursor.
export async function GET(request: Request) {
  return crmRoute(request, async () => {
    const since = new URL(request.url).searchParams.get("since");
    const valid = since && !Number.isNaN(Date.parse(since)) ? since : null;
    return Response.json(await listNewApplications(valid));
  });
}
