import { crmRoute, readJson } from "@/lib/crm/api";
import { deleteMember, setMemberAccess, setMemberStatus } from "@/lib/crm/users";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () =>
  Response.json({ error: "Account not found" }, { status: 404 });

// Owner only. { status: "active" } approves or restores an account;
// { status: "disabled" } removes its access straight away;
// { access: { applications, dial } } sets which lists it can see.
export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id)) return notFound();
      const body = (await readJson(request)) as {
        status?: unknown;
        access?: { applications?: unknown; dial?: unknown };
      } | null;

      if (body?.access) {
        const member = await setMemberAccess(id, {
          applications: body.access.applications === true,
          dial: body.access.dial === true,
        });
        return member ? Response.json({ member }) : notFound();
      }
      if (body?.status !== "active" && body?.status !== "disabled") {
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }
      const member = await setMemberStatus(id, body.status);
      return member ? Response.json({ member }) : notFound();
    },
    { ownerOnly: true }
  );
}

export async function DELETE(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id) || !(await deleteMember(id))) return notFound();
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
