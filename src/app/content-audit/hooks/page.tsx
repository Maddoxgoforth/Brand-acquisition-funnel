import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "100+ Free Viral Hook Templates — Maddox",
  description:
    "100+ free hook templates that have actually gone viral, hand-picked and used by Maddox.",
};

const PREVIEW_HOOKS = [
  "I've talked to 15 girls this year and here's the one trait you need to have to stay locked in while still having a love life",
  "Last year I _______ because _______ (example: Last year I made $100,000 at 15 because I learned how to turn attention into income)",
  "Day in the life of a _____ (age) who __________ (achievement)",
  "Here's exactly how to [outcome]. [solution].",
  "Here's the exact 3 step process to [outcome].",
  "3 signs you're probably the [trait] homie.",
];

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
            used by Maddox himself. Here&apos;s a preview, download the full
            file below.
          </p>

          <div className="w-full rounded-2xl border border-border bg-background-elevated p-6 text-left">
            <ul className="flex flex-col gap-4">
              {PREVIEW_HOOKS.map((hook, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-muted">{hook}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm font-bold uppercase tracking-widest text-accent">
              + 100 more inside the full file
            </p>
          </div>

          <a
            href="/downloads/viral-hooks.pdf"
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
