import { crmRoute, readJson } from "@/lib/crm/api";
import { sessionActor } from "@/lib/crm/auth";
import { canAccess, isClosePlan } from "@/lib/crm/constants";
import { closeLead, getLead, listEvents } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 3_000_000;

// POST { plan: "monthly" | "yearly", screenshot: "data:image/jpeg;base64,…" }
// moves the lead to Closed. Both are required.
export async function POST(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    if (!lead || !canAccess(session.access, lead.source)) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isClosePlan(body.plan)) {
      return Response.json({ error: "Pick monthly or yearly." }, { status: 400 });
    }
    const match = typeof body.screenshot === "string" ? IMAGE.exec(body.screenshot) : null;
    if (!match) {
      return Response.json(
        { error: "Add a screenshot of the successful payment (a JPG, PNG or WebP image)." },
        { status: 400 }
      );
    }
    if ((match[2].length * 3) / 4 > MAX_BYTES) {
      return Response.json({ error: "That screenshot is too big. Try a smaller one." }, { status: 400 });
    }
    const closed = await closeLead(id, body.plan, { mime: match[1], base64: match[2] }, sessionActor(session));
    if (!closed) return Response.json({ error: "Lead not found" }, { status: 404 });
    return Response.json({
      lead: closed.lead,
      discordProblem: closed.discordProblem,
      events: await listEvents(id),
    });
  });
}
