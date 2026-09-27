const PATHS = {
  package: (
    <>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  bot: (
    <>
      <rect x="5" y="9" width="14" height="10" rx="2" />
      <circle cx="9.5" cy="14" r="1.1" />
      <circle cx="14.5" cy="14" r="1.1" />
      <path d="M12 9V6" />
      <circle cx="12" cy="4.5" r="1.1" />
    </>
  ),
  dollar: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5v11M15 9.2c0-1.2-1.3-2.2-3-2.2s-3 .9-3 2.1 1.3 1.9 3 2.1 3 .9 3 2.1-1.3 2.1-3 2.1-3-1-3-2.2" />
    </>
  ),
  repeat: (
    <path d="M4 7h13l-2.5-2.5M20 17H7l2.5 2.5M4 7v3M20 17v-3" />
  ),
  trending: (
    <>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M15 6h6v6" />
    </>
  ),
} as const;

export type WhySkillIconName = keyof typeof PATHS;

export default function WhySkillIcon({ name }: { name: WhySkillIconName }) {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent">
      <svg
        viewBox="0 0 24 24"
        width={28}
        height={28}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {PATHS[name]}
      </svg>
    </span>
  );
}
