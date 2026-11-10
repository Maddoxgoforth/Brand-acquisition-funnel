import { crmRoute } from "@/lib/crm/api";
import { SOURCES, STATUSES, isSourceId } from "@/lib/crm/constants";
import { query } from "@/lib/crm/db";

// Owner-only CSV download of a list's leads (name, email, phone, status), for
// email marketing. ?list=<source id> or ?list=all.
function cell(value: string) {
  // Quote every cell; neutralise spreadsheet formulas.
  const v = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const list = new URL(request.url).searchParams.get("list") ?? "all";
      if (list !== "all" && !isSourceId(list)) return Response.json({ error: "Unknown list" }, { status: 400 });
      const rows = await query<{
        name: string;
        email: string;
        phone: string;
        status: string;
        source: string;
        created_at: string | Date;
      }>(
        `SELECT name, email, phone, status, source, created_at FROM crm_leads
         WHERE ($1 = 'all' OR source = $1)
         ORDER BY created_at DESC`,
        [list]
      );
      const label = (id: string, all: readonly { id: string; label: string }[]) =>
        all.find((x) => x.id === id)?.label ?? id;
      const lines = [
        ["Name", "Email", "Phone", "Status", "List", "Added"].map(cell).join(","),
        ...rows.map((r) =>
          [
            r.name ?? "",
            r.email ?? "",
            r.phone ?? "",
            label(r.status, STATUSES),
            label(r.source, SOURCES),
            new Date(r.created_at).toISOString().slice(0, 10),
          ]
            .map(cell)
            .join(",")
        ),
      ];
      const day = new Date().toISOString().slice(0, 10);
      return new Response(lines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="crm-${list}-${day}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    },
    { ownerOnly: true }
  );
}
