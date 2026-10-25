import { crmRoute, readJson } from "@/lib/crm/api";
import { canAccess } from "@/lib/crm/constants";
import { getLead, listEvents, setCallNotes } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string; eventId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Body: { notes }. Saves notes on one call in a lead's history.
export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id, eventId } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    if (!lead || !canAccess(session.access, lead.source)) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }
    const body = (await readJson(request)) as { notes?: unknown } | null;
    if (typeof body?.notes !== "string" || !/^\d+$/.test(eventId)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!(await setCallNotes(id, Number(eventId), body.notes))) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }
    return Response.json({ events: await listEvents(id) });
  });
}
