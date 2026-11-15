import { listAffiliatesForOwner } from "@/lib/crm/affiliates";
import { crmRoute } from "@/lib/crm/api";

const isoOrNull = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

// Owner only: every affiliate (pending first) with their numbers for the time
// frame (?from=&to=, ISO; both optional) plus all-time earned / paid / owed.
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const url = new URL(request.url);
      const affiliates = await listAffiliatesForOwner(
        isoOrNull(url.searchParams.get("from")),
        isoOrNull(url.searchParams.get("to"))
      );
      return Response.json({ affiliates });
    },
    { ownerOnly: true }
  );
}
