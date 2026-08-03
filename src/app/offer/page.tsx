import type { Metadata } from "next";
import OfferHero from "@/components/sections/OfferHero";
import OfferPitch from "@/components/sections/OfferPitch";
import OfferResults from "@/components/sections/OfferResults";
import OfferAuthority from "@/components/sections/OfferAuthority";
import OfferClose from "@/components/sections/OfferClose";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Get Instant Access — Maddox",
  description:
    "The $50/month system to build your personal brand and sell digital products.",
};

export default function Offer() {
  return (
    <main>
      <OfferHero />
      <OfferPitch />
      <OfferResults />
      <OfferAuthority />
      <OfferClose />
      <Footer />
    </main>
  );
}
