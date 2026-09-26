import type { Metadata } from "next";
import FreeCourseHero from "@/components/sections/FreeCourseHero";
import FreeCoursePitch from "@/components/sections/FreeCoursePitch";
import FreeCoursePartnership from "@/components/sections/FreeCoursePartnership";
import FreeCourseWhySkill from "@/components/sections/FreeCourseWhySkill";
import FreeCourseSystem from "@/components/sections/FreeCourseSystem";
import FreeCourseModules from "@/components/sections/FreeCourseModules";
import FreeCourseTools from "@/components/sections/FreeCourseTools";
import FreeCourseSteps from "@/components/sections/FreeCourseSteps";
import FreeCourseResults from "@/components/sections/FreeCourseResults";
import FreeCourseFaq from "@/components/sections/FreeCourseFaq";
import FreeCourseClose from "@/components/sections/FreeCourseClose";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Free Course — Maddox x Base44",
  description:
    "Get Maddox's full course on building a personal brand and selling AI digital products — free, courtesy of Base44.",
};

export default function FreeCourse() {
  return (
    <main>
      <FreeCourseHero />
      <FreeCoursePitch />
      <FreeCoursePartnership />
      <FreeCourseWhySkill />
      <FreeCourseSystem />
      <FreeCourseModules />
      <FreeCourseTools />
      <FreeCourseSteps />
      <FreeCourseResults />
      <FreeCourseFaq />
      <FreeCourseClose />
      <Footer />
    </main>
  );
}
