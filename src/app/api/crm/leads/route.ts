import { crmRoute, readJson } from "@/lib/crm/api";
import { isSourceId } from "@/lib/crm/constants";
import {
  addLeads,
  listLeads,
  normalizeLeadInput,
  type LeadInput,
} from "@/lib/crm/leads";

const MAX_IMPORT = 10000;

export async function GET(request: Request) {
  return crmRoute(request, async () => {
    const source = new URL(request.url).searchParams.get("source");
    if (!isSourceId(source)) {
      return Response.json({ error: "Unknown list" }, { status: 400 });
    }
    return Response.json({ leads: await listLeads(source) });
  });
}

// Body: { source, leads: [...] }. Each lead can be any object; see
// normalizeLeadInput for how name/phone/email are picked out.
export async function POST(request: Request) {
  return crmRoute(request, async () => {
    const body = (await readJson(request)) as {
      source?: unknown;
      leads?: unknown;
    } | null;
    if (!body || !isSourceId(body.source) || !Array.isArray(body.leads)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (body.leads.length > MAX_IMPORT) {
      return Response.json(
        { error: `Import at most ${MAX_IMPORT} leads at a time` },
        { status: 400 }
      );
    }

    const inputs = body.leads
      .map(normalizeLeadInput)
      .filter((lead): lead is LeadInput => lead !== null);
    const unreadable = body.leads.length - inputs.length;
    const result = await addLeads(body.source, inputs, "manual");

    return Response.json({
      added: result.added,
      skipped: result.skipped + unreadable,
      leads: result.leads,
    });
  });
}
