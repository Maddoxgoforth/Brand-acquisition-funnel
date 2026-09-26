export default function EmbedPlaceholder({
  label,
  aspect = "video",
}: {
  label: string;
  aspect?: "video" | "square";
}) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background-elevated px-6 text-center ${
        aspect === "video" ? "aspect-video" : "aspect-square"
      }`}
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
