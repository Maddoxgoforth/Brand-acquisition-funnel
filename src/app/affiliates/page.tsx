import { redirect } from "next/navigation";

import { getAffiliateSession } from "@/lib/crm/affiliateAuth";
import { affiliateDashboard } from "@/lib/crm/affiliates";
import DashboardView, { RANGES, rangeStart, type RangeId } from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const affiliate = await getAffiliateSession();
  if (!affiliate) redirect("/affiliates/login");
  const { range: raw } = await searchParams;
  const range: RangeId = RANGES.some((r) => r.id === raw) ? (raw as RangeId) : "30d";
  const data = await affiliateDashboard(affiliate, rangeStart(range), null);
  return <DashboardView data={data} firstName={affiliate.name.split(" ")[0]} range={range} basePath="/affiliates" />;
}
