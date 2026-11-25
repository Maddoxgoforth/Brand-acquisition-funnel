import { NextResponse, type NextRequest } from "next/server";

// Mad Media partner domain (Nov 16 2026). When the site is reached on one of
// the hosts in PARTNER_HOSTS (comma-separated, e.g. "partners.madmedia.co"),
// only the partner portal and its webhook are served; any other path goes to
// /partner, so the rest of the site never shows on that domain.
// Nov 25 2026 (owner): partners never land on brandacquisition.co. On any other
// host, /partner* is sent to the same path on the partner domain (first host in
// PARTNER_HOSTS), except /partner/demo, which checks the owner's CRM sign-in
// here and then hands the demo over to the partner domain.
const hosts = () =>
  (process.env.PARTNER_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  const { pathname } = request.nextUrl;
  const partnerPath = pathname === "/partner" || pathname.startsWith("/partner/");
  if (!hosts().includes(host)) {
    const home = hosts()[0];
    if (!home || !partnerPath || pathname === "/partner/demo") return NextResponse.next();
    return NextResponse.redirect(`https://${home}${pathname}${request.nextUrl.search}`, 308);
  }
  if (partnerPath || pathname === "/api/partner-webhook") {
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
