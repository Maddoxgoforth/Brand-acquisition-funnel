"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const FAQS = [
  {
    q: "What's the catch? How is this actually free?",
    a: "No catch. I partnered with a billion-dollar AI company, and they cover the cost of giving this away. All you need is the AI tool I already use every day.",
  },
  {
    q: "Do I have to pay for anything?",
    a: "The course, the templates, and the workshop are all free. The only thing you need is a subscription to that AI tool, which we walk you through on your onboarding call.",
  },
  {
    q: "How long does setup take?",
    a: "You're up and running by the end of the 3-day workshop. We walk you through the whole thing, step by step.",
  },
  {
    q: "Do I need experience or a following?",
    a: "No. If you can post on Instagram or TikTok, you can do this. The AI helps you the whole way.",
  },
];

export default function FreeCourseFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading eyebrow="Questions" title="Frequently Asked Questions" />

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
