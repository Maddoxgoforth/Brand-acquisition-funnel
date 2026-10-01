import type { Metadata } from "next";
import CreatorOsIntro from "@/components/sections/CreatorOsIntro";
import CreatorOsSteps from "@/components/sections/CreatorOsSteps";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Creator OS Workshop: Maddox",
  description:
    "Build your Creator OS in Base44, step by step: content, offer, money, calendar, goals, habits, and the agent that texts you every morning.",
};

export default function CreatorOsBuild() {
  return (
    <main>
      <CreatorOsIntro />
      <CreatorOsSteps />
      <Footer />
    </main>
  );
}
