import type { Metadata } from "next";
import FreeCourseConfirmationHero from "@/components/sections/FreeCourseConfirmationHero";
import FreeCourseConfirmationNextSteps from "@/components/sections/FreeCourseConfirmationNextSteps";
import FreeCoursePitch from "@/components/sections/FreeCoursePitch";
import FreeCourseConfirmationPhases from "@/components/sections/FreeCourseConfirmationPhases";
import FreeCourseConfirmationHowFree from "@/components/sections/FreeCourseConfirmationHowFree";
import FreeCourseConfirmationResults from "@/components/sections/FreeCourseConfirmationResults";
import FreeCourseConfirmationClosing from "@/components/sections/FreeCourseConfirmationClosing";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "You're In: Maddox",
  description: "Watch this video now. We'll call you within the next 5 minutes.",
};

export default function FreeCourseConfirmation() {
  return (
    <main>
      <FreeCourseConfirmationHero />
      <FreeCourseConfirmationNextSteps />
      <FreeCoursePitch />
      <FreeCourseConfirmationPhases />
      <FreeCourseConfirmationHowFree />
      <FreeCourseConfirmationResults />
      <FreeCourseConfirmationClosing />
      <Footer />
    </main>
  );
}
