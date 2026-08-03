"use client";

import { useEffect, useState } from "react";

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Cameron",
  "Avery", "Peyton", "Skyler", "Reese", "Quinn", "Dakota", "Rowan", "Emerson",
  "Blake", "Hayden", "Sawyer", "Finley",
];

const LAST_NAMES = [
  "Carter", "Brooks", "Reed", "Bennett", "Hayes", "Foster", "Coleman", "Price",
  "Sanders", "Wells", "Mitchell", "Sullivan", "Barnes", "Fisher", "Simmons",
];

const MIN_DELAY_MS = 45_000;
const MAX_DELAY_MS = 90_000;
const VISIBLE_MS = 5_000;

type Notice = { firstName: string; lastName: string };

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNotice(): Notice {
  return {
    firstName: FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)],
    lastName: LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)],
  };
}

export default function RecentActivityToast() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimeout: ReturnType<typeof setTimeout>;
    let hideTimeout: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      showTimeout = setTimeout(() => {
        setNotice(randomNotice());
        setVisible(true);
        hideTimeout = setTimeout(() => setVisible(false), VISIBLE_MS);
        scheduleNext();
      }, randomInt(MIN_DELAY_MS, MAX_DELAY_MS));
    }

    scheduleNext();
    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, []);

  if (!notice) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background-elevated px-4 py-3 shadow-lg">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {notice.firstName[0]}
        </span>
        <p className="flex-1 text-left text-sm">
          <span className="font-bold">
            {notice.firstName} {notice.lastName}
          </span>{" "}
          just got their free content audit
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="shrink-0 text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
