"use client";

import { useEffect, useRef, useState } from "react";

import FreeCourseCta from "@/components/ui/FreeCourseCta";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import WistiaEmbed from "@/components/ui/WistiaEmbed";
import { pixelCustom, pixelEvent, trackStep } from "@/lib/tracking";
import { ANSWERS_KEY, answersForCrm, type Answers } from "./quiz";

// The ad funnel's video (vertical). Put the Wistia media id here once the
// VSL is uploaded. While it's empty the page shows a placeholder and the
// opt-in button is unlocked straight away, so the funnel still works.
export const AD_VSL_MEDIA_ID = "";

// The opt-in button unlocks this many seconds before the video ends.
const UNLOCK_BEFORE_END = 30;
const UNLOCKED_KEY = "ba_vsl_unlocked";

// The quiz answers saved by /free-training, as CRM-readable text.
function readAnswers(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    return raw ? answersForCrm(JSON.parse(raw) as Answers) : {};
  } catch {
    return {};
  }
}

type PlayerElement = HTMLElement & { currentTime?: number; duration?: number; state?: string };

export default function VslGate() {
  const [unlocked, setUnlocked] = useState(!AD_VSL_MEDIA_ID);
  const [remaining, setRemaining] = useState<number | null>(null);
  const watched = useRef(0);

  useEffect(() => {
    trackStep("ads", "vsl_view");
    pixelEvent("ViewContent", { content_name: "free_course_vsl" });
    // Came back after already unlocking: keep it unlocked. (Read after
    // mount so the server-rendered page and the browser agree.)
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(UNLOCKED_KEY) === "1") setUnlocked(true);
      } catch {
        // storage blocked: normal unlock
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Count only time actually watched (seeking ahead doesn't count), then
  // unlock once they're UNLOCK_BEFORE_END seconds from the end.
  useEffect(() => {
    if (!AD_VSL_MEDIA_ID || unlocked) return;
    let last: number | null = null;
    const timer = setInterval(() => {
      const el = document.querySelector<PlayerElement>(`wistia-player[media-id="${AD_VSL_MEDIA_ID}"]`);
      const t = el?.currentTime;
      const d = el?.duration;
      if (typeof t !== "number" || typeof d !== "number" || !d) return;
      if (last !== null && t > last && t - last < 1.5) watched.current += t - last;
      last = t;
      const target = Math.max(0, d - UNLOCK_BEFORE_END);
      setRemaining(Math.max(0, Math.ceil(target - watched.current)));
      if (watched.current >= target) {
        setUnlocked(true);
        try {
          localStorage.setItem(UNLOCKED_KEY, "1");
        } catch {}
        trackStep("ads", "vsl_unlocked");
        pixelCustom("VslUnlocked");
      }
    }, 500);
    return () => clearInterval(timer);
  }, [unlocked]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center text-2xl font-extrabold leading-tight sm:text-3xl">
        Watch This Short Video To <span className="text-accent">Unlock Your Free Course</span>
      </h1>
      <p className="mt-3 rounded-full bg-background-elevated px-4 py-2 text-center text-sm font-semibold">
        👀 Keep watching. Your access button unlocks near the end of the video.
      </p>

      <div className="mt-5 w-full max-w-[340px]">
        {AD_VSL_MEDIA_ID ? (
          <WistiaEmbed mediaId={AD_VSL_MEDIA_ID} aspect={9 / 16} scrubbingDisabled />
        ) : (
          <EmbedPlaceholder aspect="vertical" label="Video coming soon" />
        )}
      </div>

      <div className="mt-6 w-full">
        <FreeCourseCta
          label="GET MY FREE COURSE →"
          funnel="ads"
          getAnswers={readAnswers}
          locked={!unlocked}
          lockedLabel={
            remaining !== null && remaining > 0
              ? `🔒 Unlocks in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : "🔒 Unlocks during the video"
          }
        />
      </div>
    </div>
  );
}
