import { crmRoute, readJson } from "@/lib/crm/api";
import { addStrike, kpiReport, setStrikeRemoved } from "@/lib/crm/kpis";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (error: string) => Response.json({ error }, { status: 400 });

// KPIs and strikes. The owner sees every closer; a team member sees only
// their own.
export async function GET(request: Request) {
  return crmRoute(request, async (session) => {
    const report = await kpiReport(session.role === "owner" ? null : session.userId);
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  });
}

// Owner only: { action: "add", userId, reason } | { action: "remove" | "restore", id }
export async function POST(request: Request) {
  return crmRoute(
    request,
    async (session) => {
      const b = (await readJson(request)) as Record<string, unknown> | null;
      if (!b) return bad("Invalid request");
      if (b.action === "add") {
        const reason = typeof b.reason === "string" ? b.reason.trim() : "";
        if (typeof b.userId !== "string" || !UUID.test(b.userId)) return bad("Invalid request");
        if (!reason) return bad("Give a reason for the strike.");
        await addStrike(b.userId, reason);
      } else if (b.action === "remove" || b.action === "restore") {
        if (typeof b.id !== "string" || !UUID.test(b.id)) return bad("Invalid request");
        await setStrikeRemoved(b.id, b.action === "remove", session.name);
      } else {
        return bad("Invalid request");
      }
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
