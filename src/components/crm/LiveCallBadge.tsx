"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/crm/constants";

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// Who is on the phone with this lead right now (owner, Nov 22 2026), with a
// running timer: "On a call with Bryson · 2:14", or "Bryson is calling…"
// while it rings. `me` is the viewer's id, shown as "You".
export default function LiveCallBadge({
  lead,
  me,
  className = "",
  large = false,
}: {
  lead: Lead;
  me: string;
  className?: string;
  large?: boolean;
}) {
  const call = lead.liveCall;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!call) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [call]);
  if (!call) return null;

  const who = call.byId === me ? "You" : call.byName;
  const seconds = (now - new Date(call.since).getTime()) / 1000;
  const text =
    call.state === "live"
      ? `🔴 On a call with ${who === "You" ? "you" : who} · ${clock(seconds)}`
      : `📞 ${who} ${who === "You" ? "are" : "is"} calling…`;
  const color = call.state === "live" ? "bg-red-600 text-white" : "bg-sky-100 text-sky-800";
  const size = large ? "px-3 py-2 text-sm" : "px-1.5 py-0.5 text-[11px]";
  return (
    <p className={`inline-block rounded-md font-extrabold tabular-nums ${size} ${color} ${className}`}>
      {text}
    </p>
  );
}
