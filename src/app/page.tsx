import Hero from "@/components/sections/Hero";
import SocialProof from "@/components/sections/SocialProof";
import Results from "@/components/sections/Results";
import Blueprint from "@/components/sections/Blueprint";
import Mentor from "@/components/sections/Mentor";
import Comparison from "@/components/sections/Comparison";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <SocialProof />
      <Results />
      <Blueprint />
      <Mentor />
      <Comparison />
      <Faq />
      <Footer />
    </main>
  );
}
