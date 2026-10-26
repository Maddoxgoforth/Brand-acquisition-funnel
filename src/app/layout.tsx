import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import MetaPixel from "@/components/tracking/MetaPixel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://brandacquisition.co"),
  title: "Maddox: No Audience. No Experience Needed.",
  description:
    "The exact 90-day system Maddox used to make real money selling his own digital products using AI before he turned 18. No audience, no experience, no guessing.",
  // Meta domain verification (Business settings → Brand safety → Domains →
  // meta-tag method): set NEXT_PUBLIC_META_DOMAIN_VERIFICATION to the code.
  ...(process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION
    ? { other: { "facebook-domain-verification": process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
        <MetaPixel />
        <Analytics />
      </body>
    </html>
  );
}
