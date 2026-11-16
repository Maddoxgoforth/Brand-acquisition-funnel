import { NextResponse, type NextRequest } from "next/server";

// Mad Media partner domain (Nov 16 2026). When the site is reached on one of
// the hosts in PARTNER_HOSTS (comma-separated, e.g. "partners.madmedia.co"),
// only the partner portal and its webhook are served; any other path goes to
// /partner, so the rest of the site never shows on that domain. Other hosts
// are untouched.
const hosts = () =>
  (process.env.PARTNER_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  if (!hosts().includes(host)) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname === "/partner" || pathname.startsWith("/partner/") || pathname === "/api/partner-webhook") {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/partner";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next's own files and static assets.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml|woff2?)$).*)"],
};
