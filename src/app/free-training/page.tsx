import { createHash } from "node:crypto";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { after } from "next/server";

import AdFunnel from "@/components/ad-funnel/AdFunnel";
import { recordSiteEvent } from "@/lib/crm/leads";

// The cold-traffic (ads) funnel: hook → quiz → personalized plan → VSL
// (/free-training/watch) → opt-in. Opt-ins land in the CRM's "Ad opt-ins".
export const metadata: Metadata = {
  title: "Free Course Quiz: Maddox",
  description: "Take the 60-second quiz to get your personalized plan and unlock Maddox's free course.",
  robots: { index: false },
};

// Crawlers, link previews and ad-review bots: not real visitors.
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|bytespider|headless|lighthouse|curl|wget|python|node-fetch|axios/i;

export default async function FreeTraining() {
  // Count the "Landed on the quiz page" step here, on the server, the moment
  // the page is requested. Counting it from the browser missed most ad
  // visitors (TikTok's in-app browser drops the beacon, and people who leave
  // before the page finishes loading were never counted). The visitor id is
  // an anonymous hash of IP + browser; recordSiteEvent ignores repeats within
  // an hour.
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const prefetch = h.get("next-router-prefetch") || h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch");
  if (ua && !BOTS.test(ua) && !prefetch) {
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
    const visitor = "srv_" + createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
    after(async () => {
      try {
        await recordSiteEvent(visitor, "ads", "view", "");
      } catch (error) {
        console.error("Server view tracking failed:", error);
      }
    });
  }

  return <AdFunnel />;
}
