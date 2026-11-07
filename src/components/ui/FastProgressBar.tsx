"use client";

import { useEffect, useRef } from "react";

type PlayerElement = HTMLElement & { currentTime?: number; duration?: number };

// Shown progress for real progress p (0–1). Runs fast early and slows later,
// so the video feels shorter: 50% shown at ~21% watched, 88% at half way.
const shown = (p: number) => 1 - (1 - p) ** 3;

/** Progress bar along the bottom of a Wistia video that moves fast at the start and slows down. */
export default function FastProgressBar({ mediaId }: { mediaId: string }) {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = document.querySelector<PlayerElement>(`wistia-player[media-id="${mediaId}"]`);
      const t = el?.currentTime;
      const d = el?.duration;
      if (fill.current && typeof t === "number" && typeof d === "number" && d > 0) {
        const p = Math.min(1, Math.max(0, t / d));
        fill.current.style.transform = `scaleX(${shown(p)})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mediaId]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-black/40">
      <div
        ref={fill}
        className="h-full origin-left bg-accent"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
