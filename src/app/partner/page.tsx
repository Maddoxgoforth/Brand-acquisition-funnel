import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { partnerEvents } from "@/lib/crm/partners";
import PartnerOverview from "./PartnerOverview";
import { buildDashboard, RANGES, type RangeId } from "./stats";

export const dynamic = "force-dynamic";

export default async function PartnerDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const { range: r } = await searchParams;
  const range: RangeId = RANGES.some((x) => x.id === r) ? (r as RangeId) : "1d";
  const d = buildDashboard(await partnerEvents(partner.id), range);
  return <PartnerOverview partner={partner} d={d} range={range} basePath="/partner" />;
}
