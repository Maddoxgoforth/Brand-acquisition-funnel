import { crmRoute } from "@/lib/crm/api";
import { contentReport } from "@/lib/crm/content";

// Owner only: the 📊 Content dashboard's data.
//   ?days=7|30|90 (omit for all time) &account=<username|PLATFORM>
//   &platform=INSTAGRAM|TIKTOK &type=all|trial|normal
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const url = new URL(request.url);
      const days = Number(url.searchParams.get("days"));
      const type = url.searchParams.get("type");
      const report = await contentReport({
        days: [1, 7, 30, 90, 365].includes(days) ? days : null,
        account: (url.searchParams.get("account") ?? "").slice(0, 120),
        platform: (url.searchParams.get("platform") ?? "").replace(/[^A-Z]/g, "").slice(0, 20),
        type: type === "trial" || type === "normal" ? type : "all",
      });
      return Response.json(report);
    },
    { ownerOnly: true }
  );
}
