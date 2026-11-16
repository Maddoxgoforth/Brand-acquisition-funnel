import { crmRoute } from "@/lib/crm/api";
import { isContentConfigured, syncContent } from "@/lib/crm/content";

export const maxDuration = 60;

// Owner only: "Refresh now". Pulls the latest stats from bundle.social for
// about 45 seconds; the UI calls again while `remaining` > 0.
export async function POST(request: Request) {
  return crmRoute(
    request,
    async () => {
      if (!isContentConfigured()) {
        return Response.json({ error: "Add BUNDLE_API_KEY in Vercel to connect bundle.social." }, { status: 503 });
      }
      return Response.json(await syncContent(45_000));
    },
    { ownerOnly: true }
  );
}
