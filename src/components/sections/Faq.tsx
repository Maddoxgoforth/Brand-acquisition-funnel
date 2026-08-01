"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";

const FAQS = [
  {
    q: "WHAT EXACTLY AM I GETTING?",
    a: "A personal 90-day roadmap built around your niche, weekly one-on-one calls plus chat access to me, the full content and digital-product courses, my custom AI Hook Generator, the complete template library, and a private community building the exact same thing.",
  },
  {
    q: "DO I NEED AN AUDIENCE OR EXPERIENCE?",
    a: "No. You start from zero, that's the whole point. I show you how to pick your niche and post content that builds an audience from scratch. I started small myself. What matters is that you commit to one thing and actually show up.",
  },
  {
    q: "HOW MUCH TIME DO I NEED?",
    a: "You don't need to work on this all day. That's exactly what the AI leverage is for. You pick your niche, commit to posting, and use the tools to cut the work down to a fraction. You can do this around school, a job, whatever you've got going on.",
  },
  {
    q: "WHAT IF I DON'T KNOW WHAT TO SELL?",
    a: "That's what your onboarding call is for. When you join, we get on a call and I help you pick your niche and figure out the one problem you're going to solve. You don't need it figured out before you start. That's literally step one.",
  },
  {
    q: "IS THIS A COURSE OR MENTORSHIP?",
    a: "Both, but the mentorship is the point. The courses give you the system; the weekly one-on-one calls and chat access are how you actually get it done. This isn't something you buy and watch. It's something we build together.",
  },
  {
    q: "HOW FAST CAN I SEE RESULTS?",
    a: "Depends on you and how much you put in. The goal is your first $10,000 in about three months if you do the work. I'm not going to promise overnight money, nothing works that way. But once it clicks, it compounds. The people who win are the ones who commit and don't quit.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            <span className="text-accent">MADDOX&apos;S</span> ANSWERS
          </h2>
          <p className="italic text-muted">
            To all of your questions and concerns
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-border bg-background-elevated"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-extrabold">{faq.q}</span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen ? (
                  <p className="px-6 pb-6 text-muted">{faq.a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
