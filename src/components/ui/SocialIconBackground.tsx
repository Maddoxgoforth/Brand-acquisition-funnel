const PATHS = {
  camera: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2.5" />
      <path d="M8 7l1.5-2.5h5L16 7" />
      <circle cx="12" cy="14" r="3.5" />
    </>
  ),
  heart: (
    <path d="M12 20.5s-7.5-4.6-9.8-9.2C.6 7.7 2.3 4 6 4c2 0 3.4 1.1 6 3.7C14.6 5.1 16 4 18 4c3.7 0 5.4 3.7 3.8 7.3C19.5 15.9 12 20.5 12 20.5Z" />
  ),
  chat: (
    <path d="M4 5h16v11H9l-4 4v-4H4Z" />
  ),
  send: <path d="M3 11 21 3l-6 18-4-8-8-2Z" />,
  bell: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0v5l2 3H4l2-3Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4.5L6 21Z" />,
  play: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M10 8.5v7l6-3.5Z" />
    </>
  ),
} as const;

type IconName = keyof typeof PATHS;

function Icon({
  name,
  className,
  size = 40,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}

export default function SocialIconBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-accent/15">
      <Icon
        name="camera"
        size={56}
        className="absolute -left-4 top-6 -rotate-12"
      />
      <Icon
        name="heart"
        size={44}
        className="absolute right-2 top-2 rotate-6"
      />
      <Icon
        name="chat"
        size={48}
        className="absolute -left-2 bottom-24 rotate-6"
      />
      <Icon
        name="send"
        size={40}
        className="absolute right-0 bottom-40 -rotate-12"
      />
      <Icon
        name="bell"
        size={36}
        className="absolute left-1/2 top-0 -translate-x-[220%] rotate-12"
      />
      <Icon
        name="bookmark"
        size={40}
        className="absolute right-4 top-1/2 -translate-y-1/2 rotate-6"
      />
      <Icon
        name="play"
        size={48}
        className="absolute -right-4 bottom-4 -rotate-6"
      />
    </div>
  );
}
