import { createHmac, timingSafeEqual } from "node:crypto";

import { ingestEvent } from "@/lib/crm/partners";

// AffiliateConsulting → Settings → Webhooks → "JSON webhook" endpoint:
//   https://<site>/api/partner-webhook
// Receives sign-ups, purchases and reversals for the owner's whole
// AffiliateConsulting account. Events whose subid belongs to a Mad Media
// partner go on that partner's dashboard; the rest are stored as the owner's.
//
// Nobody can post fake sales: either
// 1. PARTNER_WEBHOOK_SECRET is set and the request must carry (the endpoint's "whsec_..." signing
//    AffiliateConsulting's signature (the endpoint's "whsec_..." secret): header
//    X-AC-Signature: t=<unix seconds>,v1=<hex>, where
//    v1 = HMAC-SHA256(secret, t + "." + raw body) and t is at most 5 minutes old.
// or 2. no secret is set and the URL has ?key=<PARTNER_WEBHOOK_KEY>.
// X-AC-Event names the event; X-AC-Delivery is the delivery id (retries reuse
// it, so it is what de-duplicates).

const MAX_AGE_SECONDS = 5 * 60;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function keyMatches(given: string) {
  const expected = process.env.PARTNER_WEBHOOK_KEY || "";
  return Boolean(expected && given) && safeEqual(given, expected);
}

function signatureValid(header: string | null, rawBody: string) {
  const secret = process.env.PARTNER_WEBHOOK_SECRET;
  if (!secret) return true; // not set up yet: the URL key alone guards it
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const t = Number(parts.t);
  if (!parts.t || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > MAX_AGE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  // A header can carry more than one v1 (secret rotation); any match passes.
  return header
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1="))
    .some((p) => safeEqual(p.slice(3), expected));
}

export async function POST(request: Request) {
  // With the signing secret set, the signature alone proves the event is
  // real, so the URL key is optional. Without it, the key is required.
  const hasSecret = Boolean(process.env.PARTNER_WEBHOOK_SECRET);
  if (!hasSecret && !process.env.PARTNER_WEBHOOK_KEY) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }
  if (!hasSecret && !keyMatches(new URL(request.url).searchParams.get("key") ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const text = await request.text();
  if (text.length > 200_000) return Response.json({ error: "Too large" }, { status: 413 });
  if (!signatureValid(request.headers.get("x-ac-signature"), text)) {
    return Response.json({ error: "Bad signature" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    body = Object.fromEntries(params);
  }
  const meta = {
    event: request.headers.get("x-ac-event") ?? undefined,
    delivery: request.headers.get("x-ac-delivery") ?? undefined,
  };
  try {
    const events = Array.isArray(body) ? body : [body];
    const results = [];
    for (const [i, e] of events.slice(0, 100).entries()) {
      results.push(
        await ingestEvent(e, JSON.stringify(e), {
          event: meta.event,
          delivery: meta.delivery ? (events.length > 1 ? `${meta.delivery}:${i}` : meta.delivery) : undefined,
        })
      );
    }
    return Response.json({ ok: true, results });
  } catch (error) {
    console.error("partner-webhook failed", error);
    return Response.json({ error: "Failed to store event" }, { status: 500 });
  }
}
