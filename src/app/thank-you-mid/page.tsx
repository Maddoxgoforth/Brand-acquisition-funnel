import type { Metadata } from "next";
import ThankYouHero from "@/components/sections/ThankYouHero";
import WelcomeVideoMid from "@/components/sections/WelcomeVideoMid";
import ObjectionVideosMid from "@/components/sections/ObjectionVideosMid";
import MoreResults from "@/components/sections/MoreResults";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "You're Booked — Maddox",
  description:
    "Your call is confirmed. Watch these quick breakdowns before we talk.",
};

export default function ThankYouMid() {
  return (
    <main>
      <ThankYouHero />
      <WelcomeVideoMid />
      <ObjectionVideosMid />
      <MoreResults />
      <Footer />
    </main>
  );
}
