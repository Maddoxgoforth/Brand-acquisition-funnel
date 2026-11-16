import { crmRoute, readJson } from "@/lib/crm/api";
import { assignEvent } from "@/lib/crm/partners";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Owner only: { partnerId } gives a webhook event to that partner by hand;
// { partnerId: null } gives it back to the owner.
export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!/^\d{1,18}$/.test(id)) return Response.json({ error: "Event not found" }, { status: 404 });
      const body = (await readJson(request)) as { partnerId?: unknown } | null;
      const partnerId = body?.partnerId;
      if (partnerId !== null && (typeof partnerId !== "string" || !UUID.test(partnerId))) {
        return Response.json({ error: "Pick a partner" }, { status: 400 });
      }
      const result = await assignEvent(id, partnerId);
      if (result === "not_found") return Response.json({ error: "Event not found" }, { status: 404 });
      if (result === "no_partner") return Response.json({ error: "Partner not found" }, { status: 404 });
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
