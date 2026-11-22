"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { crmFetch, timeAgo } from "./api";

// 📊 Content (owner only): every post published through bundle.social with
// its views and engagement. One filter bar drives four views:
//   Overview — headline numbers, views per day, top posts, best formats
//   Posts    — every post, sortable
//   Formats  — which kinds of video perform best
//   Accounts — followers and growth per account
// Data: GET /api/crm/content, refreshed by POST /api/crm/content/sync and a
// daily cron (lib/crm/content.ts).

type Post = {
  id: string;
  platform: string;
  account: string;
  title: string;
  caption: string;
  format: string;
  trial: boolean;
  postedAt: string | null;
  permalink: string;
  thumb: string;
  seconds: number | null;
  views: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement: number | null;
};
type Format = {
  format: string;
  posts: number;
  totalViews: number;
  avgViews: number;
  medianViews: number;
  engagement: number | null;
  best: { title: string; views: number; platform: string; permalink: string };
};
type Account = {
  id: string;
  key: string;
  platform: string;
  username: string;
  team: string;
  avatar: string;
  followers: number;
  followersChange: number;
  postCount: number;
  posts: number;
  views: number;
  series: { day: string; followers: number }[];
};
type Day = {
  day: string;
  optIns: number;
  booked: number;
  closed: number;
  bookRate: number | null;
  closeRate: number | null;
  posts: number;
  views: number;
  formats: { format: string; count: number }[];
  items: Post[];
};
type Report = {
  byDay: Day[];
  kpis: { posts: number; measured: number; totalViews: number; avgViews: number; medianViews: number; engagement: number | null; likes: number; shares: number };
  posts: Post[];
  formats: Format[];
  viewsByDay: { day: string; views: number }[];
  accounts: Account[];
  accountOptions: { value: string; account: string; platform: string }[];
  sync: { startedAt: string | null; finishedAt: string | null; remaining: number; message: string } | null;
  configured: boolean;
};

const VIEWS = [
  { id: "overview", label: "Overview", hint: "The headline numbers, views per day, your top posts and best formats." },
  { id: "byday", label: "By day", hint: "Organic opt-ins each day, how many booked or bought, and what you posted that day. Click a day to see its posts." },
  { id: "posts", label: "Posts", hint: "Every post with its numbers. Click a column to sort, open a post with ↗." },
  { id: "formats", label: "Formats", hint: "Which kinds of video get the most views, on average." },
  { id: "accounts", label: "Accounts", hint: "Followers and growth for each account." },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
];

const compact = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "–";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}K`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(n).toLocaleString("en-US");
};
const pct = (n: number | null) => (n === null ? "–" : `${(n * 100).toFixed(1)}%`);
const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–";
const dayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const pill = (on: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${on ? "bg-accent text-white" : "text-muted hover:bg-background-elevated hover:text-foreground"}`;
const select = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold";
const card = "rounded-2xl border border-border bg-background";

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, [string, string]> = {
    INSTAGRAM: ["IG", "bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white"],
    TIKTOK: ["TT", "bg-slate-900 text-white"],
    SNAPCHAT: ["SC", "bg-yellow-300 text-slate-900"],
    YOUTUBE: ["YT", "bg-red-600 text-white"],
  };
  const [text, cls] = map[platform] ?? [platform.slice(0, 2), "bg-slate-200 text-slate-700"];
  return <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-extrabold ${cls}`}>{text}</span>;
}

function Thumb({ src, size = 40 }: { src: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <div className="shrink-0 rounded-md bg-background-elevated" style={{ width: size * 0.5625 * 1.4, height: size * 1.4 }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-md bg-background-elevated object-cover"
      style={{ width: size * 0.5625 * 1.4, height: size * 1.4 }}
    />
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

// Bar chart of views gained per day; hover/tap a bar for its number.
function ViewsChart({ data }: { data: { day: string; views: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="py-16 text-center text-sm text-muted">No daily view data yet for this range.</p>;
  const max = Math.max(1, ...data.map((d) => d.views));
  const shown = hover ?? data.length - 1;
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tabular-nums">{compact(data[shown].views)}</span>
        <span className="text-sm text-muted">views on {dayLabel(data[shown].day)}</span>
      </div>
      <div className="flex h-44 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.day}
            type="button"
            aria-label={`${dayLabel(d.day)}: ${d.views} views`}
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
            className="group flex h-full flex-1 items-end"
          >
            <span
              className={`w-full rounded-t-sm transition-colors ${i === shown ? "bg-accent" : "bg-accent/30 group-hover:bg-accent/60"}`}
              style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{dayLabel(data[0].day)}</span>
        <span>{dayLabel(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-10" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - min) / (max - min || 1)) * 32}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PostLine({ p, rank }: { p: Post; rank?: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {rank ? <span className="w-5 text-right text-sm font-bold text-muted tabular-nums">{rank}</span> : null}
      <Thumb src={p.thumb} size={30} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold">
          <PlatformBadge platform={p.platform} />
          <span className="truncate">{p.title}</span>
        </p>
        <p className="truncate text-xs text-muted">
          @{p.account} · {shortDate(p.postedAt)} · {p.format}
          {p.trial ? " · Trial" : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-extrabold tabular-nums">{compact(p.views)}</p>
        <p className="text-xs text-muted">views</p>
      </div>
      {p.permalink ? (
        <a href={p.permalink} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent hover:underline" title="Open the post">
          ↗
        </a>
      ) : null}
    </div>
  );
}

type SortKey = "postedAt" | "views" | "likes" | "comments" | "shares" | "saves" | "engagement";

function PostsTable({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "views", desc: true });
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? posts.filter((p) => `${p.title} ${p.caption} ${p.format} ${p.account}`.toLowerCase().includes(q)) : posts;
    const val = (p: Post) => (sort.key === "postedAt" ? (p.postedAt ? Date.parse(p.postedAt) : 0) : (p[sort.key] ?? -1));
    return [...list].sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)));
  }, [posts, sort, search]);
  const head = (key: SortKey, label: string) => (
    <th className="px-3 py-3 text-right">
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
        className={`text-xs font-bold uppercase tracking-wider ${sort.key === key ? "text-accent" : "text-muted hover:text-foreground"}`}
      >
        {label}
        {sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, captions, formats…"
          className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <span className="ml-auto text-sm text-muted">{rows.length} posts</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background-elevated/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Post</th>
              {head("postedAt", "Posted")}
              {head("views", "Views")}
              {head("likes", "Likes")}
              {head("comments", "Comments")}
              {head("shares", "Shares")}
              {head("saves", "Saves")}
              {head("engagement", "Eng. rate")}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.slice(0, limit).map((p) => (
              <tr key={`${p.id}-${p.platform}`} className="hover:bg-background-elevated/40">
                <td className="max-w-md px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Thumb src={p.thumb} size={30} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-bold">
                        <PlatformBadge platform={p.platform} />
                        <span className="truncate">{p.title}</span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        @{p.account} · {p.format}
                        {p.trial ? " · Trial reel" : ""}
                        {p.caption ? ` · “${p.caption}”` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-muted tabular-nums">{shortDate(p.postedAt)}</td>
                <td className="px-3 py-2.5 text-right font-extrabold tabular-nums">{compact(p.views)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{compact(p.likes)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{compact(p.comments)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{compact(p.shares)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{compact(p.saves)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct(p.engagement)}</td>
                <td className="px-3 py-2.5 text-right">
                  {p.permalink ? (
                    <a href={p.permalink} target="_blank" rel="noreferrer" className="font-bold text-accent hover:underline" title="Open the post">
                      ↗
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <div className="border-t border-border p-3 text-center">
          <button type="button" onClick={() => setLimit((l) => l + 100)} className="text-sm font-bold text-accent hover:underline">
            Show more ({rows.length - limit} left)
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? <p className="p-10 text-center text-sm text-muted">No posts match.</p> : null}
    </div>
  );
}

// By day: organic opt-ins vs what went out that day. Opt-ins come from the
// main free course page only; the account / platform filters change the posts.
function DaysTable({ days }: { days: Day[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (days.length === 0) return <p className={`${card} p-10 text-center text-sm text-muted`}>No opt-ins or posts in this range.</p>;
  const rate = (n: number, r: number | null) => (
    <>
      <span className="font-bold">{n}</span>
      <span className="text-muted"> · {pct(r)}</span>
    </>
  );
  return (
    <div className={card}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background-elevated/60 text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Day</th>
              <th className="px-3 py-3 text-right">Organic opt-ins</th>
              <th className="px-3 py-3 text-right">Booked a call</th>
              <th className="px-3 py-3 text-right">Bought</th>
              <th className="px-3 py-3 text-right">Posts</th>
              <th className="px-3 py-3 text-right">Views on those posts</th>
              <th className="px-4 py-3 text-left">Formats posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {days.map((d) => (
              <Fragment key={d.day}>
                <tr
                  onClick={() => setOpen((o) => (o === d.day ? null : d.day))}
                  className={`cursor-pointer hover:bg-background-elevated/40 ${open === d.day ? "bg-background-elevated/40" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-bold">
                    <span className="mr-1.5 text-muted">{open === d.day ? "▾" : "▸"}</span>
                    {new Date(`${d.day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-extrabold tabular-nums">{d.optIns}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{rate(d.booked, d.bookRate)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{rate(d.closed, d.closeRate)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{d.posts}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">{d.posts ? compact(d.views) : "–"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {d.formats.map((f) => (
                        <span key={f.format} className="rounded-full bg-background-elevated px-2 py-0.5 text-xs font-semibold">
                          {f.format}
                          {f.count > 1 ? ` ×${f.count}` : ""}
                        </span>
                      ))}
                      {d.formats.length === 0 ? <span className="text-xs text-muted">Nothing posted</span> : null}
                    </div>
                  </td>
                </tr>
                {open === d.day ? (
                  <tr>
                    <td colSpan={7} className="bg-background-elevated/20 px-6 py-2">
                      {d.items.length ? (
                        <div className="divide-y divide-border">
                          {d.items.map((p) => (
                            <PostLine key={`${p.id}-${p.platform}`} p={p} />
                          ))}
                        </div>
                      ) : (
                        <p className="py-3 text-sm text-muted">No posts went out this day.</p>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border p-3 text-xs text-muted">
        Opt-ins are from the main free course page (ad-funnel opt-ins left out), by Eastern time. Booked and Bought count that day&apos;s
        opt-ins that went on to book a call or buy, so recent days keep going up. Views are each post&apos;s total so far.
      </p>
    </div>
  );
}

function FormatsTable({ formats }: { formats: Format[] }) {
  const max = Math.max(1, ...formats.map((f) => f.avgViews));
  if (formats.length === 0) return <p className={`${card} p-10 text-center text-sm text-muted`}>No posts with stats in this range.</p>;
  return (
    <div className={card}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background-elevated/60 text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Format</th>
              <th className="px-3 py-3 text-left">Average views per post</th>
              <th className="px-3 py-3 text-right">Posts</th>
              <th className="px-3 py-3 text-right">Median</th>
              <th className="px-3 py-3 text-right">Total views</th>
              <th className="px-3 py-3 text-right">Eng. rate</th>
              <th className="px-4 py-3 text-left">Best post</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {formats.map((f, i) => (
              <tr key={f.format}>
                <td className="px-4 py-3 font-bold">
                  <span className="mr-2 text-muted tabular-nums">{i + 1}</span>
                  {f.format}
                </td>
                <td className="w-1/3 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-background-elevated">
                      <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(f.avgViews / max) * 100}%` }} />
                    </div>
                    <span className="w-14 text-right font-extrabold tabular-nums">{compact(f.avgViews)}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{f.posts}</td>
                <td className="px-3 py-3 text-right tabular-nums">{compact(f.medianViews)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{compact(f.totalViews)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(f.engagement)}</td>
                <td className="max-w-[16rem] px-4 py-3">
                  <span className="flex items-center gap-1.5 truncate">
                    <PlatformBadge platform={f.best.platform} />
                    {f.best.permalink ? (
                      <a href={f.best.permalink} target="_blank" rel="noreferrer" className="truncate font-semibold text-accent hover:underline">
                        {f.best.title}
                      </a>
                    ) : (
                      <span className="truncate font-semibold">{f.best.title}</span>
                    )}
                    <span className="shrink-0 text-muted tabular-nums">{compact(f.best.views)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountsGrid({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) return <p className={`${card} p-10 text-center text-sm text-muted`}>No account data yet. Click Refresh now.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((a) => (
        <div key={a.id} className={`${card} p-5`}>
          <div className="flex items-center gap-3">
            {a.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-background-elevated" />
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-extrabold">
                <PlatformBadge platform={a.platform} />@{a.username}
              </p>
              <p className="text-xs text-muted">{a.team}</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Followers</p>
              <p className="text-3xl font-extrabold tabular-nums">{compact(a.followers)}</p>
            </div>
            <span className={`text-sm font-bold tabular-nums ${a.followersChange >= 0 ? "text-emerald-600" : "text-danger"}`}>
              {a.followersChange >= 0 ? "+" : ""}
              {compact(a.followersChange)} in range
            </span>
          </div>
          <div className="mt-2">
            <Sparkline values={a.series.map((s) => s.followers)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
            <div>
              <p className="text-xs text-muted">Posts in range</p>
              <p className="font-bold tabular-nums">{a.posts}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Views on those posts</p>
              <p className="font-bold tabular-nums">{compact(a.views)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Content({ onError }: { onError: (e: unknown) => void }) {
  const [view, setView] = useState<ViewId>("overview");
  const [days, setDays] = useState(30);
  const [account, setAccount] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState<"all" | "trial" | "normal">("all");
  const [data, setData] = useState<Report | null>(null);
  const [loadedQs, setLoadedQs] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const qs = new URLSearchParams({ ...(days ? { days: String(days) } : {}), account, platform, type }).toString();
  const loading = loadedQs !== `${qs}#${key}`;
  const autoSynced = useRef(false);

  const refresh = useCallback(async () => {
    setSyncing("Pulling the latest numbers from bundle.social…");
    try {
      for (let round = 0; round < 8; round++) {
        const r = await crmFetch<{ posts: number; refreshed: number; remaining: number }>("/api/crm/content/sync", { method: "POST" });
        if (r.remaining === 0) break;
        setSyncing(`Updated ${r.refreshed} posts, ${r.remaining} to go…`);
      }
      setKey((k) => k + 1);
    } catch (e) {
      onError(e);
    } finally {
      setSyncing(null);
    }
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    crmFetch<Report>(`/api/crm/content?${qs}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedQs(`${qs}#${key}`);
        // First visit: nothing synced yet, so pull it straight away.
        if (d.configured && !d.sync && !autoSynced.current) {
          autoSynced.current = true;
          void refresh();
        }
      })
      .catch((e) => !cancelled && onError(e));
    return () => {
      cancelled = true;
    };
  }, [qs, key, onError, refresh]);

  const active = VIEWS.find((v) => v.id === view)!;
  const top = data ? [...data.posts].filter((p) => p.views !== null).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6) : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-6">
      {/* Title + refresh */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">📊 Content</h2>
          <p className="mt-1 text-sm text-muted">Every post published through bundle.social, with views and engagement.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted">
            {syncing ?? (data?.sync?.finishedAt ? `Updated ${timeAgo(data.sync.finishedAt)}` : "Not synced yet")}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={Boolean(syncing) || !data?.configured}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-dim disabled:opacity-50"
          >
            {syncing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </div>

      {data && !data.configured ? (
        <div className={`${card} border-amber-300 bg-amber-50 p-5 text-sm`}>
          <p className="font-bold text-amber-900">bundle.social isn&apos;t connected yet.</p>
          <p className="mt-1 text-amber-900">
            Add your bundle.social API key in Vercel as <span className="font-mono">BUNDLE_API_KEY</span> and redeploy. Your posts and stats will
            show up here.
          </p>
        </div>
      ) : null}

      {/* Where you are: the four views */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-background p-1">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={pill(view === v.id)} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{active.hint}</p>
      </div>

      {/* One filter bar for every view */}
      <div className={`${card} flex flex-wrap items-center gap-2 p-3`}>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.days} type="button" className={pill(days === r.days)} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <select className={select} value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Account">
          <option value="">All accounts</option>
          {data?.accountOptions.map((o) => (
            <option key={o.value} value={o.value}>
              @{o.account} ({o.platform === "INSTAGRAM" ? "Instagram" : o.platform === "TIKTOK" ? "TikTok" : o.platform.toLowerCase()})
            </option>
          ))}
        </select>
        <select className={select} value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
          <option value="">All platforms</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
        </select>
        <select className={select} value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Reel type">
          <option value="all">All reels</option>
          <option value="trial">Trial reels only</option>
          <option value="normal">Normal reels only</option>
        </select>
        {account || platform || type !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setAccount("");
              setPlatform("");
              setType("all");
            }}
            className="text-sm font-bold text-muted hover:text-foreground"
          >
            Clear filters
          </button>
        ) : null}
        <span className="ml-auto text-sm text-muted">{loading ? "Loading…" : `${data?.kpis.posts ?? 0} posts`}</span>
      </div>

      {!data ? (
        <p className="p-10 text-center text-muted">Loading content…</p>
      ) : view === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Posts" value={String(data.kpis.posts)} detail={`${data.kpis.measured} with stats`} />
            <Kpi label="Total views" value={compact(data.kpis.totalViews)} />
            <Kpi label="Avg views / post" value={compact(data.kpis.avgViews)} detail={`Median ${compact(data.kpis.medianViews)}`} />
            <Kpi label="Engagement rate" value={pct(data.kpis.engagement)} detail="Likes, comments, shares, saves ÷ views" />
            <Kpi label="Likes · Shares" value={`${compact(data.kpis.likes)} · ${compact(data.kpis.shares)}`} />
          </div>
          <div className={`${card} p-5`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Views gained per day</p>
            <ViewsChart data={data.viewsByDay} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Top posts</p>
                <button type="button" onClick={() => setView("posts")} className="text-sm font-bold text-accent hover:underline">
                  All posts →
                </button>
              </div>
              <div className="mt-1 divide-y divide-border">
                {top.length ? top.map((p, i) => <PostLine key={`${p.id}-${p.platform}`} p={p} rank={i + 1} />) : <p className="py-8 text-center text-sm text-muted">No posts with stats yet.</p>}
              </div>
            </div>
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Best formats (avg views)</p>
                <button type="button" onClick={() => setView("formats")} className="text-sm font-bold text-accent hover:underline">
                  All formats →
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {data.formats.slice(0, 6).map((f) => {
                  const max = Math.max(1, ...data.formats.map((x) => x.avgViews));
                  return (
                    <div key={f.format}>
                      <div className="flex justify-between text-sm">
                        <span className="font-bold">{f.format}</span>
                        <span className="tabular-nums">
                          <span className="font-extrabold">{compact(f.avgViews)}</span>
                          <span className="text-muted"> · {f.posts} posts</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-background-elevated">
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${(f.avgViews / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {data.formats.length === 0 ? <p className="py-8 text-center text-sm text-muted">No formats yet.</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : view === "byday" ? (
        <DaysTable days={data.byDay} />
      ) : view === "posts" ? (
        <PostsTable posts={data.posts} />
      ) : view === "formats" ? (
        <FormatsTable formats={data.formats} />
      ) : (
        <AccountsGrid accounts={account || platform ? data.accounts.filter((a) => (!account || a.key === account) && (!platform || a.platform === platform)) : data.accounts} />
      )}
    </div>
  );
}
