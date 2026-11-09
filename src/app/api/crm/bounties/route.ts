import { crmRoute, readJson } from "@/lib/crm/api";
import { isPayPlan } from "@/lib/crm/constants";
import { createBounty, deleteBounty, listBounties, setBountyEnded } from "@/lib/crm/pay";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (error: string) => Response.json({ error }, { status: 400 });
const whole = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

// Everyone signed in can see the bounties and how far along they are.
export async function GET(request: Request) {
  return crmRoute(request, async () => Response.json({ bounties: await listBounties() }));
}

// Owner only. { action: "create", title, description, plan, target, amount,
// mode, endsAt } | { action: "end" | "reopen" | "delete", id }
export async function POST(request: Request) {
  return crmRoute(
    request,
    async () => {
      const b = (await readJson(request)) as Record<string, unknown> | null;
      if (!b) return bad("Invalid request");
      if (b.action === "create") {
        const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
        if (!title) return bad("Give the bounty a name.");
        if (!isPayPlan(b.plan)) return bad("Pick which closes count.");
        if (!whole(b.target, 1, 1000)) return bad("How many closes? Use a whole number from 1 to 1000.");
        if (!whole(b.amount, 1, 100000)) return bad("Enter the commission in whole dollars.");
        let endsAt: string | null = null;
        if (typeof b.endsAt === "string" && b.endsAt) {
          const d = new Date(b.endsAt);
          if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return bad("The deadline has to be in the future.");
          endsAt = d.toISOString();
        }
        await createBounty({
          title,
          description: typeof b.description === "string" ? b.description.trim().slice(0, 1000) : "",
          plan: b.plan,
          target: b.target as number,
          amount: b.amount as number,
          mode: b.mode === "extra" ? "extra" : "replace",
          endsAt,
        });
      } else if (typeof b.id === "string" && UUID.test(b.id)) {
        const ok =
          b.action === "end" ? await setBountyEnded(b.id, true)
          : b.action === "reopen" ? await setBountyEnded(b.id, false)
          : b.action === "delete" ? await deleteBounty(b.id)
          : null;
        if (ok === null) return bad("Invalid request");
        if (!ok) return Response.json({ error: "Bounty not found" }, { status: 404 });
      } else {
        return bad("Invalid request");
      }
      return Response.json({ bounties: await listBounties() });
    },
    { ownerOnly: true }
  );
}
