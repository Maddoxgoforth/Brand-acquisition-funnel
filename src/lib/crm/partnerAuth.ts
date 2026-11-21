import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getSession, isAuthConfigured } from "./auth";
import { DEMO_ID, DEMO_RATES } from "./partnerDemo";
import { getActivePartner, type Partner } from "./partners";

// Mad Media partners sign in to /partner with their own cookie, separate from
// the CRM's and the UGC affiliates'.
const COOKIE = "mm_partner";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (value: string) =>
  createHmac("sha256", process.env.CRM_SESSION_SECRET || "").update(`partner:${value}`).digest("hex");

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createPartnerSession(id: string) {
  const body = `${id}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyPartnerSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(DEMO_COOKIE);
}

// Owner's demo (Nov 21 2026): /partner/demo sets DEMO_COOKIE when the owner is
// signed in to the CRM; every /partner page then shows a pretend affiliate
// filled with the owner's own sales (partnerDemo.ts). The owner session is
// re-checked on every request, so the cookie alone opens nothing.
export const DEMO_COOKIE = "mm_demo";

export async function ownerSignedIn() {
  return (await getSession())?.role === "owner";
}

export const demoPartner = (): Partner => ({
  id: DEMO_ID,
  email: "demo@madmedia.co",
  name: "Maddox Goforth",
  status: "active",
  subid: null,
  linkSubid: process.env.PARTNER_OWNER_SUBID || "mad-media",
  rates: { ...DEMO_RATES },
  createdAt: new Date(Date.UTC(2026, 9, 1)).toISOString(),
  lastLoginAt: null,
});

export async function getPartnerSession(): Promise<Partner | null> {
  if (!isAuthConfigured()) return null;
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return jar.get(DEMO_COOKIE)?.value === "1" && (await ownerSignedIn()) ? demoPartner() : null;
  const [id, expires, signature] = value.split(".");
  if (!id || !expires || !signature || !UUID.test(id)) return null;
  if (!safeEqual(signature, sign(`${id}.${expires}`))) return null;
  if (!(Number(expires) > Date.now())) return null;
  return getActivePartner(id);
}
