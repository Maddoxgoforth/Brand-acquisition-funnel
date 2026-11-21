import type { Metadata } from "next";

// Mad Media partner portal. Its own name and icon (a white "A" on black, owner's
// request Nov 21 2026) so nothing here points to
// the rest of the site (it's also served on its own domain, see proxy.ts).
const ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#020617"/><text x="32" y="45" font-family="Arial" font-weight="700" font-size="38" fill="#fff" text-anchor="middle">A</text></svg>`
  );

export const metadata: Metadata = {
  title: "Mad Media Partners",
  description: "Mad Media partner dashboard.",
  robots: { index: false, follow: false },
  icons: { icon: ICON },
  openGraph: { title: "Mad Media Partners", description: "Mad Media partner dashboard.", images: [] },
};

export default function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="min-h-screen bg-white text-slate-950 antialiased"
      style={{ fontFamily: '"Proxima Nova", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}
    >
      {children}
    </div>
  );
}
