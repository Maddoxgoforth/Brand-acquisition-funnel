import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "crm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  return process.env.CRM_SESSION_SECRET || "";
}

// The CRM stays locked (login always fails) until both values are set.
export function isAuthConfigured() {
  return Boolean(process.env.CRM_PASSWORD) && secret().length >= 16;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(expires: string) {
  return createHmac("sha256", secret()).update(expires).digest("hex");
}

export function checkPassword(attempt: string) {
  if (!isAuthConfigured()) return false;
  // Compare digests so the comparison is constant-time regardless of length.
  const digest = (value: string) =>
    createHmac("sha256", secret()).update(value).digest("hex");
  return safeEqual(digest(attempt), digest(process.env.CRM_PASSWORD!));
}

export async function createSession() {
  const expires = String(Date.now() + MAX_AGE_SECONDS * 1000);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function hasSession() {
  if (!isAuthConfigured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

// For /api/crm/* route handlers. Returns a Response to send back when the
// request isn't allowed, or null when it is.
export async function rejectUnlessAuthed(request: Request) {
  if (!(await hasSession())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  // Cookie-authenticated writes must come from this site's own pages.
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return Response.json({ error: "Bad origin" }, { status: 403 });
    }
  }
  return null;
}
