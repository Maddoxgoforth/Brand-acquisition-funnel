import { crmRoute, readJson } from "@/lib/crm/api";
import { addPartnerPayout, deletePartner, PLAN_KEYS, updatePartner, type Rates } from "@/lib/crm/partners";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => Response.json({ error: "Partner not found" }, { status: 404 });
const bad = (error = "Invalid request") => Response.json({ error }, { status: 400 });

function readRates(value: unknown): Rates | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const out = {} as Rates;
  for (const k of PLAN_KEYS) {
    const v = r[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100_000) return null;
    out[k] = v;
  }
  return out;
}

// Owner only.
//   { action: "save", subid, rates, applyToPast }   approve / edit (approves a pending partner)
//   { action: "status", status }                    "active" / "disabled"
//   { action: "payout", amount, note }              record money paid to them
export async function PATCH(request: Request, { params }: Context) {
  return crmRoute(
    request,
    async () => {
      const { id } = await params;
      if (!UUID.test(id)) return notFound();
      const body = (await readJson(request)) as Record<string, unknown> | null;
      switch (body?.action) {
        case "save": {
          const rates = readRates(body.rates);
          if (!rates) return bad("Set a commission for each plan (0 is allowed).");
          if (typeof body.subid !== "string" || !body.subid.trim()) return bad("Set their sub-ID.");
          const result = await updatePartner(id, {
            subid: body.subid,
            ...(typeof body.linkSubid === "string" ? { linkSubid: body.linkSubid } : {}),
            rates,
            applyToPast: body.applyToPast === true,
            ...(body.approve === true ? { status: "active" as const } : {}),
          });
          if (result === "subid_taken") return bad("That ID is taken (another partner, or your own sub-ID).");
          return result ? Response.json({ partner: result }) : notFound();
        }
        case "status": {
          if (body.status !== "active" && body.status !== "disabled") return bad();
          const partner = await updatePartner(id, { status: body.status });
          return partner && partner !== "subid_taken" ? Response.json({ partner }) : notFound();
        }
        case "payout": {
          const ok = await addPartnerPayout(id, Number(body.amount), typeof body.note === "string" ? body.note : "");
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
      if (!UUID.test(id) || !(await deletePartner(id))) return notFound();
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
