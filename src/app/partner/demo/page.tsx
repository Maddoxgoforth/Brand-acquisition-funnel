import { redirect } from "next/navigation";

import { getSession } from "@/lib/crm/auth";
import { DEMO_PARTNER_RATES, ownerDemoEvents, type Partner } from "@/lib/crm/partners";
import PartnerOverview from "../PartnerOverview";
import { buildDashboard, RANGES, type RangeId } from "../stats";

export const dynamic = "force-dynamic";

// Owner-only preview (Nov 21 2026): the partner dashboard filled with the
// owner's own Base44 sales from his main link, at example partner rates
// (Builder Monthly $125, Builder Yearly $350, Starter Yearly $150), to show
// partners like Henry what they would see. Read-only.
export default async function PartnerDemoPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "owner") redirect("/crm");
  const { range: r } = await searchParams;
  const range: RangeId = RANGES.some((x) => x.id === r) ? (r as RangeId) : "all";
  const partner: Partner = {
    id: "demo",
    email: "",
    name: "Maddox Goforth",
    status: "active",
    subid: null,
    linkSubid: null,
    rates: DEMO_PARTNER_RATES,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  const d = buildDashboard(await ownerDemoEvents(DEMO_PARTNER_RATES), range);
  return <PartnerOverview partner={partner} d={d} range={range} basePath="/partner/demo" />;
}
