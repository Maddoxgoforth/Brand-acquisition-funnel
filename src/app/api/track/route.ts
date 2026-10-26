import { NextResponse } from "next/server";

import { isTrackedStep } from "@/lib/crm/constants";
import { recordSiteEvent } from "@/lib/crm/leads";

// First-party funnel tracking for the CRM dashboard (visitors per step).
// Called with navigator.sendBeacon from the public pages. Stores an anonymous
// visitor id, the funnel, the step and the utm_campaign: nothing personal.
export async function POST(request: Request) {
  try {
    const body = JSON.parse(await request.text());
    const visitor = typeof body.visitor === "string" ? body.visitor : "";
    if (visitor && isTrackedStep(body.funnel, body.step)) {
      await recordSiteEvent(
        visitor,
        body.funnel,
        body.step,
        typeof body.campaign === "string" ? body.campaign : ""
      );
    }
  } catch (error) {
    console.error("Tracking failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
