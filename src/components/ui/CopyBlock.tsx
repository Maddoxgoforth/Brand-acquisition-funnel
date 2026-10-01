"use client";

import { useState } from "react";

export default function CopyBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background transition-colors hover:bg-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}
