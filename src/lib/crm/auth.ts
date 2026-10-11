import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getActiveMember } from "./users";

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

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

// The owner signs in with CRM_PASSWORD (no account needed). Everyone else
// signs in with their own account; see users.ts.
export function checkOwnerPassword(attempt: string) {
  if (!isAuthConfigured()) return false;
  // Compare digests so the comparison is constant-time regardless of length.
  const digest = (value: string) =>
    createHmac("sha256", secret()).update(value).digest("hex");
  return safeEqual(digest(attempt), digest(process.env.CRM_PASSWORD!));
}

export type Session =
  | { role: "owner"; name: string }
  | { role: "member"; userId: string; name: string; email: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `subject` is "owner" or a team member's id.
export async function createSession(subject: string) {
  const expires = String(Date.now() + MAX_AGE_SECONDS * 1000);
  const body = `${subject}.${expires}`;
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
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

export async function getSession(): Promise<Session | null> {
  if (!isAuthConfigured()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [subject, expires, signature] = value.split(".");
  if (!subject || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`${subject}.${expires}`))) return null;
  if (!(Number(expires) > Date.now())) return null;

  if (subject === "owner") return { role: "owner", name: "Owner" };
  if (!UUID.test(subject)) return null;
  // Checked against the database every time, so access the owner removes
  // stops working on the member's very next click.
  const member = await getActiveMember(subject);
  return member
    ? { role: "member", userId: member.id, name: member.name, email: member.email }
    : null;
}

// For /api/crm/* route handlers. Returns a Response to send back when the
// request isn't allowed, or the session when it is.
export async function authorize(
  request: Request,
  options: { ownerOnly?: boolean } = {}
): Promise<Session | Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (options.ownerOnly && session.role !== "owner") {
    return Response.json({ error: "Owner only" }, { status: 403 });
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
  return session;
}
