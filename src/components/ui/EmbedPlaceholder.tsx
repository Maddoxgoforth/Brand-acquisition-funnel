export default function EmbedPlaceholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-background-elevated ${className}`}
    >
      <span className="text-sm font-semibold tracking-widest text-muted">
        [ {label} ]
      </span>
    </div>
  );
}
