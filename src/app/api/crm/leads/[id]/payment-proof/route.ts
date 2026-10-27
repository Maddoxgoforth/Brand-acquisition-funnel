import { crmRoute } from "@/lib/crm/api";
import { canAccess } from "@/lib/crm/constants";
import { getLead, getLeadProofId, getPaymentProof } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The payment screenshot of a closed lead, for the lead panel.
export async function GET(request: Request, { params }: Context) {
  return crmRoute(request, async (session) => {
    const { id } = await params;
    const lead = UUID.test(id) ? await getLead(id) : null;
    const proofId = lead && canAccess(session.access, lead.source) ? await getLeadProofId(id) : null;
    const proof = proofId ? await getPaymentProof(proofId) : null;
    if (!proof) return Response.json({ error: "No screenshot" }, { status: 404 });
    return new Response(new Uint8Array(proof.bytes), {
      headers: { "Content-Type": proof.mime, "Cache-Control": "private, max-age=3600" },
    });
  });
}
