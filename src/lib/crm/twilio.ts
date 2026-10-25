import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { Access } from "./constants";

const REQUIRED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "TWILIO_TWIML_APP_SID",
  "TWILIO_PHONE_NUMBER",
] as const;

export function missingTwilioEnv() {
  return REQUIRED.filter((name) => !process.env[name]);
}

// The dialer's Twilio identity records which lists its user may call and
// who they are, e.g. "crm_a_d_uowner" or "crm_d_u<account id without
// dashes>". Twilio sends it back (signed) to the voice webhook as
// `From=client:...`, which is how that route enforces access and credits the
// call without a login cookie.
export function dialerIdentity(access: Access, actorId: string) {
  const flags = `${access.applications ? "_a" : ""}${access.dial ? "_d" : ""}`;
  return `crm${flags}_u${actorId.replace(/-/g, "")}`;
}

// Returns null when the caller isn't one of our dialer identities at all.
export function callerFromIdentity(
  from: string | undefined
): { access: Access; actorId: string | null } | null {
  const parts = (from ?? "").replace(/^client:/, "").split("_");
  if (parts[0] !== "crm") return null;
  const user = parts.find((p) => p.startsWith("u"))?.slice(1) ?? null;
  const actorId =
    user && /^[0-9a-f]{32}$/i.test(user)
      ? user.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
      : user;
  return {
    access: { applications: parts.includes("a"), dial: parts.includes("d") },
    actorId,
  };
}

// Reads a Twilio webhook's form fields and checks its signature. Twilio signs
// the public URL it requested; the bare domain redirects to www, so accept a
// signature made for either host. Returns null if it isn't from Twilio.
export async function readTwilioRequest(
  request: Request
): Promise<Record<string, string> | null> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const otherHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const signature = request.headers.get("x-twilio-signature");
  const ok = [host, otherHost].some((h) =>
    isValidTwilioSignature(`${proto}://${h}${url.pathname}${url.search}`, params, signature)
  );
  if (!ok) {
    console.error(
      `Twilio webhook ${url.pathname}: signature check failed for host ${host}. ` +
        "Check TWILIO_AUTH_TOKEN and the TwiML App's Voice Request URL."
    );
    return null;
  }
  return params;
}

// The public base URL Twilio should call back on (same host it called us on).
export function publicBase(request: Request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

// A Twilio Access Token: a short-lived JWT that lets this browser place calls
// through the TwiML App, and nothing else. Built by hand (it's ~20 lines) to
// avoid pulling the whole `twilio` server SDK into the bundle.
// Format: https://www.twilio.com/docs/iam/access-tokens
export function createVoiceToken(identity: string, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const apiKeySid = process.env.TWILIO_API_KEY_SID!;

  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: process.env.TWILIO_ACCOUNT_SID!,
    iat: now,
    exp: now + ttlSeconds,
    grants: {
      identity,
      voice: {
        outgoing: { application_sid: process.env.TWILIO_TWIML_APP_SID! },
      },
    },
  };

  const body = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;
  const signature = createHmac("sha256", process.env.TWILIO_API_KEY_SECRET!)
    .update(body)
    .digest();
  return `${body}.${base64url(signature)}`;
}

// Confirms a webhook really came from Twilio.
// https://www.twilio.com/docs/usage/security#validating-requests
export function isValidTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(data).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
