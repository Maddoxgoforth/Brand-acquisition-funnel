"use client";

import { useState } from "react";

// "Get my link" card: shows the link and copies it in one tap.
export default function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="rounded-2xl border-2 border-accent bg-background p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Your affiliate link</p>
      <p className="mt-2 break-all font-mono text-base font-bold">{link}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 w-full rounded-full bg-accent px-6 py-3 font-extrabold text-white shadow-lg shadow-accent/30 hover:bg-accent-dim"
      >
        {copied ? "✅ Copied!" : "📋 Copy my link"}
      </button>
      <p className="mt-2 text-xs text-muted">
        Put this link in your bio, captions or DMs. Anyone who opts in for the free course through it is
        credited to you, and so is every sale our team closes from those opt-ins.
      </p>
    </div>
  );
}
