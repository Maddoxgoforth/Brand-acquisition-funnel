"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";

const TOOLS = [
  "Hook Generator",
  "Offer Pricing Calculator",
  "AI Content Assistant",
  "AI Funnel Builder",
  "AI Product Builder",
];

export default function FreeCourseTools() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const progress = (window.innerHeight / 2 - rect.top) / rect.height;
      const clamped = Math.min(Math.max(progress, 0), 0.999);
      setActiveIndex(Math.floor(clamped * TOOLS.length));
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          All The Built-In Tools
        </h2>

        <div
          ref={trackRef}
          className="relative w-full"
          style={{ height: `${TOOLS.length * 45}vh` }}
        >
          <div className="sticky top-1/2 flex -translate-y-1/2 flex-col items-center gap-7">
            {TOOLS.map((tool, i) => (
              <p
                key={tool}
                className={`text-2xl font-extrabold transition-all duration-300 sm:text-3xl ${
                  i === activeIndex
                    ? "scale-105 text-accent"
                    : "text-muted/30"
                }`}
              >
                {tool}
              </p>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
