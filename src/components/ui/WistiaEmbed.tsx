import Script from "next/script";

export default function WistiaEmbed({
  mediaId,
  aspect = 16 / 9,
}: {
  mediaId: string;
  /** Width/height ratio — pass 9/16 for a vertical/portrait video. Defaults to 16:9 landscape. */
  aspect?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border">
      <Script src="https://fast.wistia.com/player.js" strategy="afterInteractive" />
      <Script
        src={`https://fast.wistia.com/embed/${mediaId}.js`}
        type="module"
        strategy="afterInteractive"
      />
      <wistia-player media-id={mediaId} aspect={aspect} />
    </div>
  );
}
