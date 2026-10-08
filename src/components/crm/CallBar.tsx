"use client";

import { useEffect, useState } from "react";

import type { DialerState } from "./useDialer";

function Timer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <span className="tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}

export default function CallBar({
  state,
  onHangUp,
  onToggleMute,
  onDismissError,
}: {
  state: DialerState;
  onHangUp: () => void;
  onToggleMute: () => void;
  onDismissError: () => void;
}) {
  if (state.error) {
    return (
      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-4 rounded-2xl border border-danger bg-background px-5 py-3 shadow-xl">
        <p className="text-sm font-semibold text-danger">{state.error}</p>
        <button
          type="button"
          onClick={onDismissError}
          className="text-sm font-bold text-muted hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (state.phase === "idle" || !state.lead) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-5 rounded-2xl bg-foreground px-5 py-3 text-white shadow-xl">
      <div className="min-w-0">
        <p className="truncate font-bold">{state.lead.name || "No name"}</p>
        <p className="text-sm text-white/70">
          {state.lead.phone} ·{" "}
          {state.phase === "in-call" && state.startedAt ? (
            <Timer startedAt={state.startedAt} />
          ) : state.phase === "ringing" ? (
            "Ringing…"
          ) : (
            "Calling…"
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        disabled={state.phase !== "in-call"}
        className="rounded-full border border-white/30 px-4 py-2 text-sm font-bold transition-colors hover:bg-white/10 disabled:opacity-40"
      >
        {state.muted ? "Unmute" : "Mute"}
      </button>
      <button
        type="button"
        onClick={onHangUp}
        className="rounded-full bg-danger px-5 py-2 text-sm font-bold transition-opacity hover:opacity-90"
      >
        Hang up
      </button>
    </div>
  );
}
