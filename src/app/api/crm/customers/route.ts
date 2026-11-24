import { crmRoute, noAccess, readJson } from "@/lib/crm/api";
import { sessionActor } from "@/lib/crm/auth";
import { isCustomerStatus } from "@/lib/crm/constants";
import { NotACustomerError, listCustomers, setCustomerStatus } from "@/lib/crm/customers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Customers board (owner, Nov 24 2026). Anyone who can work leads (opt-ins
// or dial lists) sees it.
export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    if (!session.access.applications && !session.access.dial) return noAccess();
    return Response.json({ leads: await listCustomers() }, { headers: { "Cache-Control": "no-store" } });
  });
}

// { id, status }: move a customer to another column.
export async function POST(request: Request) {
  return crmRoute(request, async (session) => {
    if (!session.access.applications && !session.access.dial) return noAccess();
    const b = (await readJson(request)) as Record<string, unknown> | null;
    if (!b || typeof b.id !== "string" || !UUID.test(b.id) || !isCustomerStatus(b.status)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    try {
      const lead = await setCustomerStatus(b.id, b.status, sessionActor(session));
      if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
      return Response.json({ lead });
    } catch (e) {
      if (e instanceof NotACustomerError) return Response.json({ error: e.message }, { status: 400 });
      throw e;
    }
  });
}
