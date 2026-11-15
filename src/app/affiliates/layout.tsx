import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate dashboard: Maddox",
  robots: { index: false, follow: false },
};

export default function AffiliatesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
