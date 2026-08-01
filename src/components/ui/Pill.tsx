import { ReactNode } from "react";

export default function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background-elevated px-4 py-2 text-sm font-semibold text-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      {children}
    </span>
  );
}
