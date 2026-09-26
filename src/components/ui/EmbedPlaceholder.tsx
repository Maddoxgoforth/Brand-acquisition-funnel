const ASPECT_CLASSES = {
  video: "aspect-video",
  square: "aspect-square",
  vertical: "aspect-[9/16]",
} as const;

export default function EmbedPlaceholder({
  label,
  aspect = "video",
}: {
  label: string;
  aspect?: keyof typeof ASPECT_CLASSES;
}) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background-elevated px-6 text-center ${ASPECT_CLASSES[aspect]}`}
    >
      <span className="text-2xl" aria-hidden>
        ▶
      </span>
      <p className="text-sm font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
    </div>
  );
}
