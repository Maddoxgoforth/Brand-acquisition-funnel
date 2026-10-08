import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export default function CrmLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
