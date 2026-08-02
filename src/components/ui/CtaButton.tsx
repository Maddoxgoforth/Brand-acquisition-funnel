export default function CtaButton({
  label = "APPLY NOW",
  subtext = "Book your intro call",
  href = "#apply",
}: {
  label?: string;
  subtext?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <a
        href={href}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-8 py-5 text-center transition-colors hover:bg-accent-dim"
      >
        <span className="flex flex-col items-center">
          <span className="text-lg font-extrabold tracking-wide text-white">
            {label}
          </span>
          <span className="text-sm font-medium text-white/80">{subtext}</span>
        </span>
        <span aria-hidden className="text-xl text-white">
          ↘
        </span>
      </a>
      <p className="text-center text-sm font-medium italic text-accent">
        No experience needed. Just action.
      </p>
    </div>
  );
}
