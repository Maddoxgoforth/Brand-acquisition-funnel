import type { Metadata } from "next";
import ThankYouHero from "@/components/sections/ThankYouHero";
import WelcomeVideo from "@/components/sections/WelcomeVideo";
import ObjectionVideos from "@/components/sections/ObjectionVideos";
import MoreResults from "@/components/sections/MoreResults";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "You're Booked — Maddox",
  description:
    "Your call is confirmed. Watch these quick breakdowns before we talk.",
};

export default function ThankYou() {
  return (
    <main>
      <ThankYouHero />
      <WelcomeVideo />
      <ObjectionVideos />
      <MoreResults />
      <Footer />
    </main>
  );
}
