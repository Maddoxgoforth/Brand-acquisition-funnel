export default function EmbedPlaceholder({
  label,
  id,
  className = "",
}: {
  label: string;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={`flex min-h-[220px] w-full items-center justify-center rounded-2xl border border-border bg-background-elevated ${className}`}
    >
      <span className="text-sm font-semibold tracking-widest text-muted">
        [ {label} ]
      </span>
    </div>
  );
}
