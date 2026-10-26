import "server-only";

import { createHash } from "node:crypto";

// Meta Conversions API: sends conversions from the server so Meta still sees
// them when a browser blocks the Pixel. Every event carries the same event id
// the browser Pixel used (when there is one), so Meta counts it once.
//
// Needs META_CAPI_TOKEN and a Pixel id (META_PIXEL_ID or
// NEXT_PUBLIC_META_PIXEL_ID). Without them every call is a no-op.
// META_TEST_EVENT_CODE (optional) routes events to Events Manager → Test events.

export type MetaUser = {
  email?: string;
  phone?: string;
  firstName?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  externalId?: string;
};

export type MetaEvent = {
  name: "Lead" | "Schedule" | "Purchase" | "CompleteRegistration" | string;
  eventId: string;
  url?: string;
  user: MetaUser;
  customData?: Record<string, string | number>;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function normalized(user: MetaUser) {
  const data: Record<string, string | string[]> = {};
  const email = user.email?.trim().toLowerCase();
  if (email) data.em = [sha256(email)];
  const digits = user.phone?.replace(/\D/g, "");
  if (digits) data.ph = [sha256(digits.length === 10 ? `1${digits}` : digits)];
  const first = user.firstName?.trim().split(/\s+/)[0]?.toLowerCase();
  if (first) data.fn = [sha256(first)];
  if (user.externalId) data.external_id = [sha256(user.externalId)];
  if (user.ip) data.client_ip_address = user.ip;
  if (user.userAgent) data.client_user_agent = user.userAgent;
  if (user.fbc) data.fbc = user.fbc;
  if (user.fbp) data.fbp = user.fbp;
  return data;
}

export function metaConfigured() {
  return Boolean(
    process.env.META_CAPI_TOKEN &&
      (process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID)
  );
}

// Best effort: never throws, gives up after 4 seconds.
export async function sendMetaEvent(event: MetaEvent): Promise<void> {
  if (!metaConfigured()) return;
  const pixel = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const version = process.env.META_GRAPH_VERSION ? `${process.env.META_GRAPH_VERSION}/` : "";
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: event.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        ...(event.url ? { event_source_url: event.url } : {}),
        user_data: normalized(event.user),
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}${pixel}/events?access_token=${encodeURIComponent(
        process.env.META_CAPI_TOKEN!
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) {
      console.error(`Meta CAPI ${event.name} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
  } catch (error) {
    console.error(`Meta CAPI ${event.name} request failed:`, error);
  }
}

// The visitor's IP and user agent from the incoming request (Vercel sets
// x-forwarded-for).
export function requestContext(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = request.headers.get("user-agent") || "";
  return { ip, userAgent };
}
