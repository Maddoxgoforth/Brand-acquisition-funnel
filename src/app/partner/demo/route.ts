import { NextResponse } from "next/server";

import {
  DEMO_COOKIE,
  DEMO_MAX_AGE_SECONDS,
  createDemoCookie,
  createDemoPass,
  ownerSignedIn,
  validDemoPass,
} from "@/lib/crm/partnerAuth";

// Owner-only: opens the affiliate portal in demo mode (see partnerDemo.ts).
// "Sign out" inside the portal ends it.
// Nov 25 2026 (owner): the demo runs on the partner domain (Mad Media), not
// brandacquisition.co. Share link: https://www.madmediaaffiliate.com/partner/demo
//   partner domain, no pass -> brandacquisition.co/partner/demo (his CRM sign-in)
//   brandacquisition.co, owner -> partner domain /partner/demo?t=<60s pass>
//   partner domain + valid pass -> signed 12h demo cookie, then /partner
const MAIN_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.brandacquisition.co").replace(/\/$/, "");
const partnerHosts = () =>
  (process.env.PARTNER_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || url.host).toLowerCase().split(":")[0];
  const onPartnerHost = partnerHosts().includes(host);
  const pass = url.searchParams.get("t") || undefined;

  if (pass) {
    if (!validDemoPass(pass)) return NextResponse.redirect(new URL("/partner/demo", request.url));
    const res = NextResponse.redirect(new URL("/partner", request.url));
    res.cookies.set(DEMO_COOKIE, createDemoCookie(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEMO_MAX_AGE_SECONDS,
    });
    return res;
  }

  if (onPartnerHost) return NextResponse.redirect(`${MAIN_SITE}/partner/demo`);
  if (!(await ownerSignedIn())) return NextResponse.redirect(new URL("/crm/login?owner=1", request.url));
  const home = partnerHosts()[0];
  const target = home ? `https://${home}/partner/demo` : new URL("/partner/demo", request.url).toString();
  return NextResponse.redirect(`${target}?t=${encodeURIComponent(createDemoPass())}`);
}
