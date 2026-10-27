"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Mad Media LLC's pixel ("Brand Acquisition" in TikTok Events Manager).
// NEXT_PUBLIC_TIKTOK_PIXEL_ID overrides it.
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "DBFUQ5BC77UASCMGN6O0";
const PIXEL_ID = TIKTOK_PIXEL_ID;

// Loads the TikTok Pixel on the public pages (never on the private /crm) and
// sends a page view on every page change.
export default function TikTokPixel() {
  const pathname = usePathname();
  const isPrivate = pathname?.startsWith("/crm");

  // The snippet sends the first page view itself.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (PIXEL_ID && !isPrivate) window.ttq?.page();
  }, [pathname, isPrivate]);

  if (!PIXEL_ID || isPrivate) return null;
  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {`!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
ttq.load(${JSON.stringify(PIXEL_ID)});
ttq.page();
}(window, document, 'ttq');`}
    </Script>
  );
}
