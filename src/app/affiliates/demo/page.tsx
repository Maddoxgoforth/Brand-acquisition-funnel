import { redirect } from "next/navigation";

import { getSession } from "@/lib/crm/auth";
import { DEMO_RATE, mainLinkDemoDashboard } from "@/lib/crm/affiliates";
import DashboardView, { RANGES, rangeStart, type RangeId } from "../DashboardView";

export const dynamic = "force-dynamic";

// Owner-only preview of the affiliate dashboard, filled with the owner's own
// main-link sales at example rates (Builder Monthly $125, Starter Yearly $150,
// Builder Yearly $350), for showing partners what they would see.
export default async function AffiliateDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "owner") redirect("/crm");
  const { range: raw } = await searchParams;
  const range: RangeId = RANGES.some((r) => r.id === raw) ? (raw as RangeId) : "all";
  const data = await mainLinkDemoDashboard(DEMO_RATE, rangeStart(range), null);
  return <DashboardView data={data} firstName="Maddox" range={range} basePath="/affiliates/demo" demo />;
}
