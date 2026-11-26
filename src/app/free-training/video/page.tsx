import type { Metadata } from "next";

import Disclaimer from "@/components/ad-funnel/Disclaimer";
import QuickVsl from "@/components/ad-funnel/QuickVsl";

// 24-hour test (Nov 25 2026): quiz → this page (organic VSL + open opt-in).
// See QUICK_VSL_TEST in AdFunnel.tsx.
export const metadata: Metadata = {
  title: "Your Free Course: Maddox",
  description: "Watch the video and get Maddox's free course.",
  robots: { index: false },
};

export default function FreeTrainingVideo() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-10 pt-8">
        <QuickVsl />
        <div className="mt-12">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
