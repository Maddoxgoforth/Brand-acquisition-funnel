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

// Owner's demo (Nov 21 2026): every /partner page shows a pretend affiliate
// filled with the owner's own sales (partnerDemo.ts).
// Nov 25 2026 (owner): the demo runs on the partner domain. His CRM sign-in
// lives on brandacquisition.co, so /partner/demo there checks it and hands a
// 60-second signed pass to /partner/demo?t= on the partner domain, which turns
// it into a signed 12-hour DEMO_COOKIE. Only the owner can get a pass.
export const DEMO_COOKIE = "mm_demo";
export const DEMO_MAX_AGE_SECONDS = 60 * 60 * 12;
const PASS_SECONDS = 60;
const demoSign = (kind: string, expires: number) =>
  createHmac("sha256", process.env.CRM_SESSION_SECRET || "").update(`partner-demo:${kind}:${expires}`).digest("hex");
const signed = (kind: string, seconds: number) => {
  const expires = Date.now() + seconds * 1000;
  return `${expires}.${demoSign(kind, expires)}`;
};
function validSigned(kind: string, value: string | undefined) {
  if (!process.env.CRM_SESSION_SECRET || !value) return false;
  const [expires, signature] = value.split(".");
  const at = Number(expires);
  return Boolean(signature) && at > Date.now() && safeEqual(signature, demoSign(kind, at));
}
export const createDemoPass = () => signed("pass", PASS_SECONDS);
export const validDemoPass = (value: string | undefined) => validSigned("pass", value);
export const createDemoCookie = () => signed("cookie", DEMO_MAX_AGE_SECONDS);

export async function ownerSignedIn() {
  return (await getSession())?.role === "owner";
}

export const demoPartner = (): Partner => ({
  id: DEMO_ID,
  email: "goforthkmaddox@gmail.com",
  name: "Maddox Goforth",
  status: "active",
  // Owner, Nov 25 2026: demo links look like a real partner's
  // (subid=mad-media&sharedid=maddoxgoforth). Display only.
  subid: "maddoxgoforth",
  linkSubid: null,
  rates: { ...DEMO_RATES },
  createdAt: new Date(Date.UTC(2026, 9, 1)).toISOString(),
  lastLoginAt: null,
});

export async function getPartnerSession(): Promise<Partner | null> {
  if (!isAuthConfigured()) return null;
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) {
    const demo = jar.get(DEMO_COOKIE)?.value;
    if (validSigned("cookie", demo)) return demoPartner();
    return demo === "1" && (await ownerSignedIn()) ? demoPartner() : null;
  }
  const [id, expires, signature] = value.split(".");
  if (!id || !expires || !signature || !UUID.test(id)) return null;
  if (!safeEqual(signature, sign(`${id}.${expires}`))) return null;
  if (!(Number(expires) > Date.now())) return null;
  return getActivePartner(id);
}
