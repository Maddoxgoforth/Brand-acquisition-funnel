import { timingSafeEqual } from "node:crypto";

import { runSafely } from "@/lib/crm/api";
import { getPaymentProof, signProof } from "@/lib/crm/leads";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Payment screenshots for the Discord close posts. No sign-in, so the link
// carries a signature only the server can make.
export async function GET(request: Request, { params }: Context) {
  return runSafely(async () => {
    const { id } = await params;
    const sig = new URL(request.url).searchParams.get("sig") ?? "";
    const expected = UUID.test(id) ? signProof(id) : "";
    const ok =
      expected.length > 0 &&
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    const proof = ok ? await getPaymentProof(id) : null;
    if (!proof) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(proof.bytes), {
      headers: {
        "Content-Type": proof.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "noindex",
      },
    });
  });
}
