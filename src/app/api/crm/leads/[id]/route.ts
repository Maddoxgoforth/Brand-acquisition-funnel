import { crmRoute, readJson } from "@/lib/crm/api";
import type { Session } from "@/lib/crm/auth";
import {
  canAccess,
  isStatusId,
  zonedTimeToIso,
} from "@/lib/crm/constants";
import {
  AppointmentRequiredError,
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

// A lead in a list this person can't see is treated as if it doesn't exist.
async function findLead(session: Session, id: string) {
  const lead = UUID.test(id) ? await getLead(id) : null;
  return lead && canAccess(session.access, lead.source) ? lead : null;
}

export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    const lead = await findLead(session, id);
    if (!lead) return notFound();
    return Response.json({ lead, events: await listEvents(id) });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    if (!(await findLead(session, id))) return notFound();

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
    // { appointment: { date: "2026-10-21", time: "15:00", timeZone: "America/New_York" } }
    if (body.appointment !== undefined) {
      const a = body.appointment as Record<string, unknown> | null;
      const at =
        a && typeof a.date === "string" && typeof a.time === "string" && typeof a.timeZone === "string"
          ? zonedTimeToIso(a.date, a.time, a.timeZone)
          : null;
      if (!at) {
        return Response.json(
          { error: "Pick a valid date, time and time zone." },
          { status: 400 }
        );
      }
      patch.appointment = { at, timeZone: (a as { timeZone: string }).timeZone };
    }

    let lead;
    try {
      lead = await updateLead(id, patch);
    } catch (error) {
      if (error instanceof AppointmentRequiredError) {
        return Response.json(
          { error: "Add the appointment date and time first." },
          { status: 400 }
        );
      }
      throw error;
    }
    if (!lead) return notFound();
    return Response.json({ lead, events: await listEvents(id) });
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    if (!(await findLead(session, id)) || !(await deleteLead(id))) {
      return notFound();
    }
    return Response.json({ ok: true });
  });
}
