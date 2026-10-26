import type { Metadata } from "next";

import AdFunnel from "@/components/ad-funnel/AdFunnel";

// The cold-traffic (ads) funnel: hook → quiz → personalized plan → VSL
// (/free-training/watch) → opt-in. Opt-ins land in the CRM's "Ad opt-ins".
export const metadata: Metadata = {
  title: "Free Course Quiz: Maddox",
  description: "Take the 60-second quiz to get your personalized plan and unlock Maddox's free course.",
  robots: { index: false },
};

export default function FreeTraining() {
  return <AdFunnel />;
}
