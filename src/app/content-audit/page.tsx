import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import Quiz from "@/components/content-audit/Quiz";
import RecentActivityToast from "@/components/content-audit/RecentActivityToast";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Free Content Audit — Maddox",
  description:
    "Answer a few questions and get a free, personalized game plan: your niche, content ideas, and 3 high-ticket digital products you could sell.",
};

export default function ContentAudit() {
  return (
    <main>
      <RecentActivityToast />

      <section className="pt-12 pb-10">
        <Container className="flex flex-col items-center gap-6 text-center">
          <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>
          <Pill>Free Content Audit</Pill>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Get Your Free{" "}
            <span className="text-accent">Personalized Game Plan</span>
          </h1>
          <p className="max-w-md text-lg text-muted">
            Answer a few quick questions and we&apos;ll send you your niche,
            a couple of content ideas, and 3 high-ticket digital products you
            could sell — free.
          </p>
        </Container>
      </section>

      <section className="pb-16">
        <Container className="flex flex-col items-center">
          <Quiz />
        </Container>
      </section>

      <Footer />
    </main>
  );
}
