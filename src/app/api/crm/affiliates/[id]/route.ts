import {
  addAffiliatePayout,
  approveAffiliate,
  deleteAffiliate,
  setAffiliateRate,
  setAffiliateStatus,
  type AffiliateRate,
} from "@/lib/crm/affiliates";
import { crmRoute, readJson } from "@/lib/crm/api";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => Response.json({ error: "Affiliate not found" }, { status: 404 });
const bad = (error = "Invalid request") => Response.json({ error }, { status: 400 });

function readRate(value: unknown): AffiliateRate | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const monthly = n(r.monthly), yearly = n(r.yearly), builderYearly = n(r.builderYearly);
  return monthly === null || yearly === null || builderYearly === null ? null : { monthly, yearly, builderYearly };
}

// Owner only.
//   { action: "approve", rate }               approve + first commission rates
//   { action: "status", status }              "active" (restore) / "disabled"
//   { action: "rate", rate, applyToPast }     change commission rates
//   { action: "payout", amount, note }        record money paid to them
export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id)) return notFound();
      const body = (await readJson(request)) as Record<string, unknown> | null;
      switch (body?.action) {
        case "approve": {
          const rate = readRate(body.rate);
          if (!rate) return bad("Set a commission for each plan (0 is allowed).");
          const affiliate = await approveAffiliate(id, rate);
          return affiliate ? Response.json({ affiliate }) : notFound();
        }
        case "status": {
          if (body.status !== "active" && body.status !== "disabled") return bad();
          const affiliate = await setAffiliateStatus(id, body.status);
          return affiliate ? Response.json({ affiliate }) : notFound();
        }
        case "rate": {
          const rate = readRate(body.rate);
          if (!rate) return bad("Set a commission for each plan (0 is allowed).");
          await setAffiliateRate(id, rate, body.applyToPast === true);
          return Response.json({ ok: true });
        }
        case "payout": {
          const ok = await addAffiliatePayout(id, Number(body.amount), typeof body.note === "string" ? body.note : "");
          return ok ? Response.json({ ok: true }) : bad("Enter an amount.");
        }
        default:
          return bad();
      }
    },
    { ownerOnly: true }
  );
}

export async function DELETE(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id) || !(await deleteAffiliate(id))) return notFound();
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
