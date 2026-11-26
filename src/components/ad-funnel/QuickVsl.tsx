"use client";

import { useEffect } from "react";

import FreeCourseCta from "@/components/ui/FreeCourseCta";
import WistiaEmbed from "@/components/ui/WistiaEmbed";
import { pixelEvent, trackStep } from "@/lib/tracking";
import { ANSWERS_KEY, answersForCrm, type Answers } from "./quiz";

// 24-hour test page (owner, Nov 25 2026): right after the quiz, the organic
// free-course VSL (same video as the home page) with the opt-in button open
// underneath, so they can opt in without watching the whole thing. Opt-ins
// still go to Ad opt-ins with the quiz answers and the same ad reporting
// (qualifiesForAds); "Funnel version" marks them as from this test.
export const TEST_VERSION = "Quiz → organic VSL (test Nov 25)";
const ORGANIC_VSL_MEDIA_ID = "mmgcz1a9lr";

function readAnswers(): Record<string, string> {
  let answers: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    if (raw) answers = answersForCrm(JSON.parse(raw) as Answers);
  } catch {
    // storage blocked: opt-in goes without the answers
  }
  return { ...answers, "Funnel version": TEST_VERSION };
}

export default function QuickVsl() {
  useEffect(() => {
    trackStep("ads", "vsl_view");
    pixelEvent("ViewContent", { content_name: "free_course_vsl_quick" });
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
        This Used To Be Part Of My <span className="text-accent">$4,000</span> Course. Now You Can Learn It For Free.
      </h1>
      <p className="max-w-md text-muted">Watch the video below to get the step-by-step to start learning.</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-bold text-accent">
          ✓ No experience needed
        </span>
        <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-bold text-accent">
          ✓ No audience needed
        </span>
      </div>
      <div className="mx-auto w-3/4">
        <WistiaEmbed mediaId={ORGANIC_VSL_MEDIA_ID} aspect={0.5625} scrubbingDisabled fastProgress />
      </div>
      <div className="w-full">
        <FreeCourseCta label="GET MY FREE COURSE →" funnel="ads" getAnswers={readAnswers} />
      </div>
    </div>
  );
}
