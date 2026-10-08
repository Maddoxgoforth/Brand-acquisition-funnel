import { createHash, timingSafeEqual } from "node:crypto";

import { readJson, runSafely } from "@/lib/crm/api";
import { isSourceId } from "@/lib/crm/constants";
import { addLeads, normalizeLeadInput, type LeadInput } from "@/lib/crm/leads";

// Inbound webhook for pushing leads into the CRM from outside this site
// (Zapier, Typeform, a spreadsheet script). Not used by the free-course form,
// which writes to the CRM directly in /api/free-course-lead.
//
//   POST /api/crm/webhook?list=free_course_application
//   Header: x-crm-secret: <CRM_WEBHOOK_SECRET>   (or ?key=<secret>)
//   Body:   one lead object, or { "leads": [ ... ] }
//
// Any field that isn't name / phone / email is kept on the lead as extra info.

function secretMatches(given: string | null) {
  const expected = process.env.CRM_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const given =
    request.headers.get("x-crm-secret") || url.searchParams.get("key");
  if (!secretMatches(given)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runSafely(async () => {
    const list = url.searchParams.get("list") ?? "free_course_application";
    if (!isSourceId(list)) {
      return Response.json({ error: "Unknown list" }, { status: 400 });
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const rawLeads = Array.isArray((body as { leads?: unknown }).leads)
      ? ((body as { leads: unknown[] }).leads)
      : [body];

    const inputs = rawLeads
      .slice(0, 1000)
      .map(normalizeLeadInput)
      .filter((lead): lead is LeadInput => lead !== null);
    const result = await addLeads(list, inputs, "webhook");

    return Response.json({ added: result.added, skipped: result.skipped });
  });
}
