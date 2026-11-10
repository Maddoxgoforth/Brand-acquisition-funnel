"use client";

import { useEffect } from "react";

import type { ChartSpec, Frame } from "./statsUi";
import TrendPanel from "./TrendPanel";

// The graph a stat card opens when clicked.
export default function TrendDialog({
  spec,
  frame,
  owner,
  onClose,
}: {
  spec: ChartSpec;
  frame: Frame;
  owner: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-3xl bg-background p-6 text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">📈 Over time</h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-bold text-muted hover:bg-background-elevated">
            Close ✕
          </button>
        </div>
        <TrendPanel spec={spec} frame={frame} owner={owner} />
      </div>
    </div>
  );
}
