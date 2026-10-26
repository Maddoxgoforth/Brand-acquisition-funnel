"use client";

import { useEffect } from "react";

import type { FunnelId } from "@/lib/crm/constants";
import { trackStep } from "@/lib/tracking";

// Drop into a server-rendered page to count a funnel step on load.
export default function TrackStep({ funnel, step }: { funnel: FunnelId; step: string }) {
  useEffect(() => {
    trackStep(funnel, step);
  }, [funnel, step]);
  return null;
}
