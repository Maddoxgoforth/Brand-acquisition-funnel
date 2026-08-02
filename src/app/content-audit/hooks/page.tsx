import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "100+ Free Viral Hook Templates — Maddox",
  description:
    "100+ free hook templates that have actually gone viral, hand-picked and used by Maddox.",
};

export default function HookTemplates() {
  return (
    <main>
      <section className="pt-12 pb-16">
        <Container className="flex flex-col items-center gap-6 text-center">
          <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>
          <Pill>Free Resource</Pill>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            100+ Free <span className="text-accent">Viral Hook Templates</span>
          </h1>
          <p className="max-w-md text-lg text-muted">
            Over 100 hooks that have actually gone viral — hand-picked and
            used by Maddox himself. Preview them below, or download the full
            file.
          </p>

          <EmbedPlaceholder
            label="HOOK TEMPLATES FILE"
            className="min-h-[400px]"
          />

          <a
            href="#"
            download
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-8 py-5 text-center font-extrabold text-white transition-colors hover:bg-accent-dim"
          >
            ↓ Download The Free Hooks
          </a>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
