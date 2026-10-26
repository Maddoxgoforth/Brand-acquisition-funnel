import type { Metadata } from "next";

import Disclaimer from "@/components/ad-funnel/Disclaimer";
import VslGate from "@/components/ad-funnel/VslGate";

export const metadata: Metadata = {
  title: "Watch To Unlock Your Free Course: Maddox",
  description: "Watch the short video to unlock Maddox's free course.",
  robots: { index: false },
};

export default function FreeTrainingWatch() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-10 pt-8">
        <VslGate />
        <div className="mt-12">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
