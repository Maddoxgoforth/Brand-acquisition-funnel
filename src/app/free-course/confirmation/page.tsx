import type { Metadata } from "next";
import FreeCourseConfirmationHero from "@/components/sections/FreeCourseConfirmationHero";
import FreeCourseConfirmationResults from "@/components/sections/FreeCourseConfirmationResults";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "You're In: Maddox",
  description: "Watch this video now. We'll call you within the next 5 minutes.",
};

export default function FreeCourseConfirmation() {
  return (
    <main>
      <FreeCourseConfirmationHero />
      <FreeCourseConfirmationResults />
      <Footer />
    </main>
  );
}
