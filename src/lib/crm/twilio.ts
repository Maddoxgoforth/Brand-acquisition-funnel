import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

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
