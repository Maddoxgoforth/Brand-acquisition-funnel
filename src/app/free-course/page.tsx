import type { Metadata } from "next";
import FreeCourseHero from "@/components/sections/FreeCourseHero";
import FreeCoursePitch from "@/components/sections/FreeCoursePitch";
import FreeCourseResults from "@/components/sections/FreeCourseResults";
import FreeCoursePartnership from "@/components/sections/FreeCoursePartnership";
import FreeCourseClose from "@/components/sections/FreeCourseClose";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Free Course — Maddox x Base44",
  description:
    "Get Maddox's full course on building a personal brand and selling digital products using AI — free, courtesy of Base44.",
};

export default function FreeCourse() {
  return (
    <main>
      <FreeCourseHero />
      <FreeCoursePitch />
      <FreeCourseResults />
      <FreeCoursePartnership />
      <FreeCourseClose />
      <Footer />
    </main>
  );
}
