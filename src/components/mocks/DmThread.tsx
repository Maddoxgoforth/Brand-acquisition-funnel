export default function DmThread() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500" />
          <div>
            <p className="text-sm font-semibold text-white">jt</p>
            <p className="text-[11px] text-zinc-500">Active 5h ago</p>
          </div>
        </div>
        <div className="flex gap-3 text-zinc-500">
          <span aria-hidden>📞</span>
          <span aria-hidden>🎥</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        <div className="flex flex-col items-start gap-1">
          <span className="max-w-[75%] rounded-2xl rounded-tl-sm bg-zinc-800 px-3 py-2 text-sm text-white">
            Broooooo
          </span>
        </div>

        <div className="my-1 overflow-hidden rounded-xl bg-white text-zinc-900">
          <div className="px-3 pt-3 text-[11px] text-zinc-500">
            Last 90 days · 5 visitors
          </div>
          <div className="flex items-baseline justify-between px-3 pt-1">
            <div>
              <p className="text-[10px] text-zinc-500">Sessions</p>
              <p className="text-sm font-bold">1.88K</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Total sales</p>
              <p className="text-sm font-bold">$530.12</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Total orders</p>
              <p className="text-sm font-bold">57</p>
            </div>
          </div>
          <svg viewBox="0 0 200 40" className="mt-2 h-10 w-full text-sky-500">
            <path
              d="M0 34 Q 40 30 60 20 T 110 26 T 150 10 T 200 4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </svg>
          <div className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
            Boost confidence with split shipping in checkout
          </div>
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="max-w-[75%] rounded-2xl rounded-tl-sm bg-zinc-800 px-3 py-2 text-sm text-white">
            $530 i made because of you ❤️
          </span>
        </div>

        <div className="flex flex-col items-end gap-1 self-end">
          <span className="max-w-[75%] rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-sm text-white">
            Yessirrrr 🔥🔥🔥
          </span>
        </div>
      </div>
    </div>
  );
}
