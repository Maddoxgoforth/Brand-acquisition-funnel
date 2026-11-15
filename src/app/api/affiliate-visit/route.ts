import { NextResponse } from "next/server";

import { activeAffiliateByCode } from "@/lib/crm/affiliates";
import { recordSiteEvent } from "@/lib/crm/leads";

// Counts a visit through an affiliate's link (/?ref=CODE) for their dashboard.
// Anonymous visitor id + the code only; at most one row per visitor per hour.
export async function POST(request: Request) {
  try {
    const body = JSON.parse(await request.text());
    const visitor = typeof body.visitor === "string" ? body.visitor.slice(0, 64) : "";
    const code = typeof body.code === "string" ? body.code : "";
    const affiliate = visitor && code ? await activeAffiliateByCode(code) : null;
    if (affiliate?.code) await recordSiteEvent(visitor, "affiliate", "view", affiliate.code);
  } catch (error) {
    console.error("Affiliate visit tracking failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
