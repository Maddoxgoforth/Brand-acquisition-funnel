"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";

const TOOLS = [
  "Hook Generator",
  "Offer Pricing Calculator",
  "AI Content Assistant",
  "AI Funnel Builder",
  "AI Product Builder",
];

export default function FreeCourseTools() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % TOOLS.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          All The Built-In Tools
        </h2>

        <div className="flex flex-col items-center gap-7">
          {TOOLS.map((tool, i) => (
            <p
              key={tool}
              className={`text-2xl font-extrabold transition-all duration-500 sm:text-3xl ${
                i === activeIndex ? "scale-105 text-accent" : "text-muted/30"
              }`}
            >
              {tool}
            </p>
          ))}
        </div>
      </Container>
    </section>
  );
}
