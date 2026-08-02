import Script from "next/script";

export default function WistiaEmbed({ mediaId }: { mediaId: string }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border">
      <Script src="https://fast.wistia.com/player.js" strategy="afterInteractive" />
      <Script
        src={`https://fast.wistia.com/embed/${mediaId}.js`}
        type="module"
        strategy="afterInteractive"
      />
      <wistia-player media-id={mediaId} aspect="1.7777777777777777" />
    </div>
  );
}
