import "server-only";

import { createHash } from "node:crypto";

// TikTok Events API: the server-side twin of the TikTok Pixel, so TikTok
// still sees conversions when a browser blocks the pixel. Events carry the
// same event_id as the browser event, so TikTok counts each one once.
//
// Needs TIKTOK_EVENTS_TOKEN and a pixel id (TIKTOK_PIXEL_ID or
// NEXT_PUBLIC_TIKTOK_PIXEL_ID). Without them every call is a no-op.
// TIKTOK_TEST_EVENT_CODE (optional) shows events under Events Manager → Test events.
//
// Event names are TikTok standard events (case-sensitive): SubmitForm (opt-in),
// Schedule (booked call), Purchase (closed), ViewContent.

export type TikTokUser = {
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  ttp?: string; // the pixel's _ttp cookie
  ttclid?: string; // TikTok click id from the ad link
  externalId?: string;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function e164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits.length === 10 ? `1${digits}` : digits}`;
}

export function tiktokConfigured() {
  return Boolean(
    process.env.TIKTOK_EVENTS_TOKEN &&
      (process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID)
  );
}

// Best effort: never throws, gives up after 4 seconds.
export async function sendTikTokEvent(event: {
  name: "SubmitForm" | "Schedule" | "Purchase" | "ViewContent" | string;
  eventId: string;
  url?: string;
  user: TikTokUser;
  properties?: Record<string, string | number>;
}): Promise<void> {
  if (!tiktokConfigured()) return;
  const pixel = process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const u = event.user;
  const user: Record<string, string> = {};
  const email = u.email?.trim().toLowerCase();
  if (email) user.email = sha256(email);
  const phone = u.phone ? e164(u.phone) : "";
  if (phone) user.phone = sha256(phone);
  if (u.externalId) user.external_id = sha256(u.externalId);
  if (u.ip) user.ip = u.ip;
  if (u.userAgent) user.user_agent = u.userAgent;
  if (u.ttp) user.ttp = u.ttp;
  if (u.ttclid) user.ttclid = u.ttclid;

  const body: Record<string, unknown> = {
    event_source: "web",
    event_source_id: pixel,
    data: [
      {
        event: event.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        user,
        ...(event.url ? { page: { url: event.url } } : {}),
        ...(event.properties ? { properties: event.properties } : {}),
      },
    ],
  };
  if (process.env.TIKTOK_TEST_EVENT_CODE) body.test_event_code = process.env.TIKTOK_TEST_EVENT_CODE;

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": process.env.TIKTOK_EVENTS_TOKEN! },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    const text = await res.text();
    // TikTok answers 200 with { code: 0 } on success; anything else is an error.
    if (!res.ok || !/"code"\s*:\s*0\b/.test(text)) {
      console.error(`TikTok Events API ${event.name} failed: ${res.status} ${text.slice(0, 300)}`);
    }
  } catch (error) {
    console.error(`TikTok Events API ${event.name} request failed:`, error);
  }
}
