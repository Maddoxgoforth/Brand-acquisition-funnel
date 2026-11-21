import { NextResponse } from "next/server";

import { DEMO_COOKIE, ownerSignedIn } from "@/lib/crm/partnerAuth";

// Owner-only: opens the affiliate portal in demo mode (see partnerDemo.ts).
// "Sign out" inside the portal ends it.
export async function GET(request: Request) {
  if (!(await ownerSignedIn())) return NextResponse.redirect(new URL("/crm/login?owner=1", request.url));
  const res = NextResponse.redirect(new URL("/partner", request.url));
  res.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
