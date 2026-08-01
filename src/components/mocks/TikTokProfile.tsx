export default function TikTokProfile() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="flex items-center gap-1 font-semibold text-white">
          Maddox Goforth <span className="text-zinc-500">⌄</span>
        </p>
        <div className="flex gap-4 text-zinc-400">
          <span aria-hidden>🗓</span>
          <span aria-hidden>☰</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-2 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-fuchsia-600 text-3xl font-black text-white">
          M
        </span>
        <p className="font-semibold text-white">@maddox.goforth</p>
        <p className="flex items-center gap-1 text-sm font-medium text-rose-500">
          ⚠ Account warning
        </p>

        <div className="mt-2 flex gap-8">
          <div>
            <p className="text-lg font-bold text-white">7</p>
            <p className="text-xs text-zinc-400">Following</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">290.2K</p>
            <p className="text-xs text-zinc-400">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">5.9M</p>
            <p className="text-xs text-zinc-400">Likes</p>
          </div>
        </div>

        <div className="mt-3 flex w-full gap-2">
          <span className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs text-zinc-300">
            @maddox.goforth
          </span>
          <span className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs text-zinc-300">
            Share profile
          </span>
        </div>
      </div>
    </div>
  );
}
