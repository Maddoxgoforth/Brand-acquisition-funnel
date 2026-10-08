import { crmRoute, readJson } from "@/lib/crm/api";
import { isStatusId } from "@/lib/crm/constants";
import {
  deleteLead,
  getLead,
  listEvents,
  updateLead,
  type LeadPatch,
} from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () =>
  Response.json({ error: "Lead not found" }, { status: 404 });

export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async () => {
    const { id } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    if (!lead) return notFound();
    return Response.json({ lead, events: await listEvents(id) });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id)) return notFound();

    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const patch: LeadPatch = {};
    for (const key of ["name", "phone", "email", "notes"] as const) {
      if (typeof body[key] === "string") patch[key] = body[key];
    }
    if (body.status !== undefined) {
      if (!isStatusId(body.status)) {
        return Response.json({ error: "Unknown status" }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.extra && typeof body.extra === "object") {
      patch.extra = body.extra as Record<string, string>;
    }

    const lead = await updateLead(id, patch);
    if (!lead) return notFound();
    return Response.json({ lead, events: await listEvents(id) });
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return crmRoute(request, async () => {
    const { id } = await params;
    if (!UUID.test(id) || !(await deleteLead(id))) return notFound();
    return Response.json({ ok: true });
  });
}
