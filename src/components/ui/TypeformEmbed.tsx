"use client";

import { Widget } from "@typeform/embed-react";

export default function TypeformEmbed({ id }: { id: string }) {
  return (
    <div id="apply" className="w-full overflow-hidden rounded-2xl border border-border">
      <Widget id={id} className="h-[500px] w-full" />
    </div>
  );
}
