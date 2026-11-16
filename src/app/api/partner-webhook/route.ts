import { timingSafeEqual } from "node:crypto";

import { ingestEvent } from "@/lib/crm/partners";

// AffiliateConsulting → Settings → Webhooks → "JSON webhook" endpoint:
//   https://<site>/api/partner-webhook?key=<PARTNER_WEBHOOK_KEY>
// Receives sign-ups, purchases and reversals for the owner's whole
// AffiliateConsulting account. Events whose subid belongs to a Mad Media
// partner go on that partner's dashboard; the rest are stored as the owner's.
// The key in the URL is what keeps strangers from posting fake sales.

function keyMatches(given: string) {
  const expected = process.env.PARTNER_WEBHOOK_KEY || "";
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.PARTNER_WEBHOOK_KEY) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }
  if (!keyMatches(new URL(request.url).searchParams.get("key") ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const text = (await request.text()).slice(0, 200_000);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // Postback-style requests: fields in the query string or a form body.
    const params = new URLSearchParams(text || new URL(request.url).search);
    params.delete("key");
    body = Object.fromEntries(params);
  }
  try {
    const events = Array.isArray(body) ? body : [body];
    const results = [];
    for (const e of events.slice(0, 100)) results.push(await ingestEvent(e, JSON.stringify(e)));
    return Response.json({ ok: true, results });
  } catch (error) {
    console.error("partner-webhook failed", error);
    return Response.json({ error: "Failed to store event" }, { status: 500 });
  }
}

// Some tools send a GET postback; treat its query string as the event.
export async function GET(request: Request) {
  if (!process.env.PARTNER_WEBHOOK_KEY || !keyMatches(new URL(request.url).searchParams.get("key") ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  params.delete("key");
  if ([...params.keys()].length === 0) return Response.json({ ok: true, ready: true });
  const body = Object.fromEntries(params);
  return Response.json({ ok: true, results: [await ingestEvent(body, JSON.stringify(body))] });
}
