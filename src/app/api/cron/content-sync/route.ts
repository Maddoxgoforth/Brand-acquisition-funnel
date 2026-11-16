import { isContentConfigured, lastSync, syncContent } from "@/lib/crm/content";

export const maxDuration = 300;

// Daily Vercel cron (vercel.json): refreshes the 📊 Content dashboard from
// bundle.social. With CRON_SECRET set, Vercel sends it as a Bearer token and
// anything else is refused; without it, runs at most once an hour (the sync
// only reads from bundle.social, so the limit just stops wasted calls).
export async function GET(request: Request) {
  if (!isContentConfigured()) return Response.json({ skipped: "BUNDLE_API_KEY not set" });
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const last = await lastSync();
    if (last?.startedAt && Date.now() - new Date(last.startedAt).getTime() < 3600_000) {
      return Response.json({ skipped: "ran less than an hour ago" });
    }
  }
  try {
    let result = await syncContent(120_000);
    // Two passes cover a big backlog (first run) within the time limit.
    if (result.remaining > 0) result = await syncContent(120_000);
    return Response.json(result);
  } catch (error) {
    console.error("content cron failed", error);
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
