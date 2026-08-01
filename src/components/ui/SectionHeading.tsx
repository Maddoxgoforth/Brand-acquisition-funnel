import { ReactNode } from "react";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {eyebrow ? (
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-md text-base text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
