const ICONS = {
  "eye-off": (
    <>
      <path d="M2 12s3.5-6 10-6c1.6 0 3 .3 4.2.8M22 12s-1.2 2.1-3.4 3.8M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M6.6 6.6 2 2m20 20-4.6-4.6" />
    </>
  ),
  hook: (
    <>
      <path d="M9 3v9a4 4 0 0 0 8 0v-1" />
      <circle cx="17" cy="16" r="2.5" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10.5" y="10.5" width="3" height="3" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  tag: (
    <>
      <path d="M12.5 3H5a2 2 0 0 0-2 2v7.5a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8l-9-9a2 2 0 0 0-1.4-.6Z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  bot: (
    <>
      <rect x="5" y="9" width="14" height="10" rx="2" />
      <circle cx="9.5" cy="14" r="1.2" />
      <circle cx="14.5" cy="14" r="1.2" />
      <path d="M12 9V6M9 6h6" />
      <circle cx="12" cy="4.5" r="1.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
      >
        3
      </text>
    </>
  ),
} as const;

export type ModuleIconName = keyof typeof ICONS;

export default function ModuleIcon({ name }: { name: ModuleIconName }) {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white">
      <svg
        viewBox="0 0 24 24"
        width={32}
        height={32}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {ICONS[name]}
      </svg>
    </span>
  );
}
