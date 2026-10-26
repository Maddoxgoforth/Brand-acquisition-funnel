"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

import { captureAttribution } from "@/lib/tracking";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Loads the Meta Pixel on the public pages (never on the private /crm) and
// sends a PageView on every page change. Also remembers ad parameters from
// the URL for the opt-in form. With NEXT_PUBLIC_META_PIXEL_ID unset, only
// the ad-parameter capture runs.
export default function MetaPixel() {
  const pathname = usePathname();
  const isPrivate = pathname?.startsWith("/crm");

  // The Pixel snippet sends the first PageView itself; later client-side
  // page changes send their own.
  const first = useRef(true);
  useEffect(() => {
    captureAttribution();
    if (first.current) {
      first.current = false;
      return;
    }
    if (PIXEL_ID && !isPrivate) window.fbq?.("track", "PageView");
  }, [pathname, isPrivate]);

  if (!PIXEL_ID || isPrivate) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});fbq('track', 'PageView');`}
    </Script>
  );
}
