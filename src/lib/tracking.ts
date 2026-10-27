// Browser-side tracking helpers shared by the public pages: an anonymous
// visitor id, ad attribution (utm_* / fbclid, kept from the ad click), the
// first-party funnel tracking (/api/track, for the CRM dashboard) and the
// Meta Pixel. Every function is safe to call during SSR or with storage
// blocked: it just does nothing.

import type { FunnelId } from "@/lib/crm/constants";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      page: () => void;
      identify: (data: Record<string, string>) => void;
      track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;
    };
  }
}

const ATTR_KEY = "ba_attr";
const VISITOR_KEY = "ba_vid";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid"];

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function visitorId(): string {
  const s = storage();
  let id = s?.getItem(VISITOR_KEY) ?? "";
  if (!id) {
    id = newId();
    s?.setItem(VISITOR_KEY, id);
  }
  return id;
}

// Call once per page load: if the URL carries ad parameters, remember them
// (the latest ad click wins) along with the page they landed on.
export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const key of UTM) {
    const v = params.get(key);
    if (v) found[key] = v.slice(0, 300);
  }
  if (Object.keys(found).length === 0) return;
  found.landing_page = window.location.pathname;
  found.landing_url = window.location.href.slice(0, 500);
  found.captured_at = String(Date.now());
  storage()?.setItem(ATTR_KEY, JSON.stringify(found));
}

function cookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

// Everything the opt-in form sends along about where this visitor came from.
export function attribution(): Record<string, string> {
  let stored: Record<string, string> = {};
  try {
    stored = JSON.parse(storage()?.getItem(ATTR_KEY) ?? "{}");
  } catch {
    stored = {};
  }
  // Meta's click id: the Pixel's _fbc cookie, or built from fbclid the way
  // Meta documents it (fb.1.<timestamp>.<fbclid>).
  const fbc =
    cookie("_fbc") ||
    (stored.fbclid ? `fb.1.${stored.captured_at || Date.now()}.${stored.fbclid}` : "");
  const fbp = cookie("_fbp");
  const ttp = cookie("_ttp");
  if (ttp) stored = { ...stored, ttp };
  const out: Record<string, string> = { ...stored };
  delete out.captured_at;
  if (fbc) out.fbc = fbc;
  if (fbp) out.fbp = fbp;
  if (!out.landing_url && typeof window !== "undefined") {
    out.landing_page = window.location.pathname;
    out.landing_url = window.location.href.slice(0, 500);
  }
  return out;
}

// Funnel step for the CRM dashboard (unique visitors per step).
export function trackStep(funnel: FunnelId, step: string) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    visitor: visitorId(),
    funnel,
    step,
    campaign: attribution().utm_campaign ?? "",
  });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
}

// Meta's event name → TikTok's standard event (case-sensitive).
const TIKTOK_EVENTS: Record<string, string> = {
  Lead: "SubmitForm",
  ViewContent: "ViewContent",
};

// Browser pixel events for Meta and TikTok. Each pixel is a no-op until it's
// installed (NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_TIKTOK_PIXEL_ID). The
// same event id goes to both pixels and to the server events, so each
// platform counts the conversion once.
export function pixelEvent(name: string, params: Record<string, unknown> = {}, eventId?: string) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", name, params, eventId ? { eventID: eventId } : undefined);
  const tt = TIKTOK_EVENTS[name];
  if (tt) window.ttq?.track(tt, params, eventId ? { event_id: eventId } : undefined);
}

async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// TikTok advanced matching: tells the pixel who just opted in (email and phone
// hashed with SHA-256 in the browser, as TikTok requires), before the
// SubmitForm event, so TikTok can match the sign-up to the ad they saw.
export async function identifyForAds(email: string, phone: string) {
  if (typeof window === "undefined" || !window.ttq || !crypto?.subtle) return;
  try {
    const data: Record<string, string> = {};
    const e = email.trim().toLowerCase();
    if (e) data.email = await sha256Hex(e);
    const digits = phone.replace(/\D/g, "");
    if (digits) data.phone_number = await sha256Hex(`+${digits.length === 10 ? `1${digits}` : digits}`);
    if (Object.keys(data).length) window.ttq.identify(data);
  } catch {
    // matching is a bonus; the event still goes out
  }
}

export function pixelCustom(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.fbq?.("trackCustom", name, params);
  window.ttq?.track(name, params);
}

export { newId as newEventId };
