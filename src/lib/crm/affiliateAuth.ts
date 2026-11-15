import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getActiveAffiliate, type Affiliate } from "./affiliates";
import { isAuthConfigured } from "./auth";

// Affiliates sign in to /affiliates with their own cookie, separate from the
// CRM's, so an affiliate session can never open the CRM.
const COOKIE = "aff_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (value: string) =>
  createHmac("sha256", process.env.CRM_SESSION_SECRET || "").update(`affiliate:${value}`).digest("hex");

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createAffiliateSession(id: string) {
  const body = `${id}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyAffiliateSession() {
  (await cookies()).delete(COOKIE);
}

// Re-checked against the database on every request, so removed access stops
// working straight away.
export async function getAffiliateSession(): Promise<Affiliate | null> {
  if (!isAuthConfigured()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [id, expires, signature] = value.split(".");
  if (!id || !expires || !signature || !UUID.test(id)) return null;
  if (!safeEqual(signature, sign(`${id}.${expires}`))) return null;
  if (!(Number(expires) > Date.now())) return null;
  return getActiveAffiliate(id);
}
