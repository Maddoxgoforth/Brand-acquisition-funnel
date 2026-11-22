import "server-only";

import { query } from "./db";

// Content dashboard (owner's request, Nov 16 2026): pulls every post that
// went out through bundle.social, with views / likes / comments / shares /
// saves per platform, plus each account's followers, into the CRM's own
// tables so the 📊 Content tab can sort, filter and compare formats.
//
// bundle.social API (key in BUNDLE_API_KEY):
//   GET /team/                                   teams + their social accounts
//   GET /post/?teamId&status=POSTED&limit&offset posts that went out
//   GET /analytics/post?postId&platformType      daily snapshots for one post
//   GET /analytics/social-account?teamId&platformType  daily account snapshots
// bundle.social refreshes stats about once a day, so a daily sync (cron +
// "Refresh now") is enough.

const API = "https://api.bundle.social/api/v1";
const TZ = "America/New_York";
const STATS_PLATFORMS = new Set(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "THREADS", "LINKEDIN", "TWITTER"]);

export const isContentConfigured = () => Boolean(process.env.BUNDLE_API_KEY);

async function bundle<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-api-key": process.env.BUNDLE_API_KEY || "" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`bundle.social ${res.status} on ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0);

// ---- format names from post titles -------------------------------------------

const FORMAT_NAMES: Record<string, string> = {
  list: "List",
  takes: "Hot takes",
  stopped: "Things I stopped",
  thennow: "Then vs now",
  counter: "Money counter",
  reply: "Comment reply",
  pov: "POV",
  dump: "Photo dump",
  quote: "Quote",
};

// Every post's title says what it is (set when it was scheduled):
// "Break Free v137", "main_list_0", "Trial reel: d05.mp4", ...
export function classifyTitle(raw: string): { format: string; label: string } {
  const title = (raw || "").replace(/^Trial reel:\s*/i, "").replace(/\.(mp4|mov)$/i, "").trim();
  let m = title.match(/^(main|second)_([a-z]+)_(\d+)/i);
  if (m) return { format: FORMAT_NAMES[m[2].toLowerCase()] ?? m[2], label: `${FORMAT_NAMES[m[2].toLowerCase()] ?? m[2]} #${Number(m[3]) + 1}` };
  m = title.match(/^Break Free v(\d+)/i);
  if (m) return { format: "Break Free", label: `Break Free v${m[1]}` };
  m = title.match(/^d(\d{1,3})$/i);
  if (m) return { format: "Daily story reel", label: `Daily reel ${m[1]}` };
  if (/broke to rich/i.test(title)) return { format: "Broke to Rich", label: title };
  return { format: "Other", label: title || "Untitled" };
}

// ---- sync ---------------------------------------------------------------------

type Team = { id: string; name: string; socialAccounts?: { id: string; type: string; username?: string; displayName?: string; avatarUrl?: string }[] };
type BundlePost = {
  id: string;
  teamId: string;
  title: string | null;
  postedDate: string | null;
  postDate: string;
  data: Record<string, { text?: string; trialParams?: unknown } | null>;
  externalData: Record<string, { permalink?: string } | null> | null;
  uploads?: { upload?: { iconUrl?: string; thumbnailUrl?: string; videoLength?: number } }[];
};
type StatItem = { views?: number; likes?: number; comments?: number; shares?: number; saves?: number; createdAt: string };
type AccountItem = { followers?: number; views?: number; likes?: number; comments?: number; postCount?: number; createdAt: string };

async function allPosts(teamId: string): Promise<BundlePost[]> {
  const out: BundlePost[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const page = await bundle<{ items?: BundlePost[] }>(`/post/?teamId=${teamId}&status=POSTED&limit=100&offset=${offset}`);
    const items = page.items ?? [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

async function pool<T>(items: T[], size: number, deadline: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length && Date.now() < deadline) {
        const item = items[i++];
        try {
          await fn(item);
        } catch (error) {
          console.error("content sync item failed", error);
        }
        done++;
      }
    })
  );
  return done;
}

export type SyncResult = { posts: number; refreshed: number; remaining: number; accounts: number };

// Pulls teams, accounts and posts, then refreshes post stats until
// `budgetMs` runs out. Posts from the last 30 days refresh every run; older
// ones every 3 days. Call again while `remaining` > 0.
export async function syncContent(budgetMs = 45_000): Promise<SyncResult> {
  if (!isContentConfigured()) throw new Error("BUNDLE_API_KEY isn't set");
  const deadline = Date.now() + budgetMs;
  await query(
    `INSERT INTO crm_content_sync (id, started_at, message) VALUES (1, now(), 'running')
     ON CONFLICT (id) DO UPDATE SET started_at = now(), message = 'running'`
  );

  const teams = (await bundle<{ items?: Team[] }>(`/team/`)).items ?? [];

  // Accounts: daily follower / view snapshots.
  let accounts = 0;
  const usernames = new Map<string, string>(); // `${teamId}:${platform}` -> username
  for (const team of teams) {
    for (const acc of team.socialAccounts ?? []) {
      usernames.set(`${team.id}:${acc.type}`, acc.username || acc.displayName || "");
      if (!STATS_PLATFORMS.has(acc.type)) continue;
      try {
        const r = await bundle<{ items?: AccountItem[] }>(`/analytics/social-account?teamId=${team.id}&platformType=${acc.type}`);
        const byDay = new Map<string, AccountItem>();
        for (const it of r.items ?? []) {
          const d = dayOf(it.createdAt);
          const prev = byDay.get(d);
          if (!prev || prev.createdAt < it.createdAt) byDay.set(d, it);
        }
        for (const [day, it] of byDay) {
          await query(
            `INSERT INTO crm_content_accounts (account_id, day, platform, username, team_name, avatar_url, followers, views, likes, comments, post_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (account_id, day) DO UPDATE SET followers = $7, views = $8, likes = $9, comments = $10, post_count = $11,
               username = $4, team_name = $5, avatar_url = $6`,
            [acc.id, day, acc.type, acc.username || acc.displayName || "", team.name, acc.avatarUrl || "", num(it.followers), num(it.views), num(it.likes), num(it.comments), num(it.postCount)]
          );
        }
        accounts++;
      } catch (error) {
        console.error("content sync account failed", error);
      }
    }
  }

  // Posts: one row per post per platform it went out on.
  type Job = { post: BundlePost; platform: string; team: Team };
  const jobs: Job[] = [];
  let posts = 0;
  for (const team of teams) {
    for (const post of await allPosts(team.id)) {
      posts++;
      const platforms = Object.keys(post.externalData ?? {}).filter((p) => post.data?.[p]);
      // Snapchat etc. have no stats in bundle.social, so they're left out.
      for (const platform of (platforms.length ? platforms : Object.keys(post.data ?? {})).filter((p) => STATS_PLATFORMS.has(p))) {
        jobs.push({ post, platform, team });
      }
    }
  }
  const known = new Map(
    (await query<{ post_id: string; platform: string; synced_at: string | Date }>(`SELECT post_id, platform, synced_at FROM crm_content_posts`)).map((r) => [
      `${r.post_id}:${r.platform}`,
      new Date(r.synced_at).getTime(),
    ])
  );
  const now = Date.now();
  const due = jobs
    .filter(({ post, platform }) => {
      const last = known.get(`${post.id}:${platform}`);
      if (!last) return true;
      const age = now - new Date(post.postedDate || post.postDate).getTime();
      const every = age < 30 * 86400_000 ? 6 * 3600_000 : 3 * 86400_000;
      return now - last > every;
    })
    // Newest first, so the posts you care about refresh first.
    .sort((a, b) => (b.post.postedDate || b.post.postDate).localeCompare(a.post.postedDate || a.post.postDate));

  const refreshed = await pool(due, 6, deadline, async ({ post, platform, team }) => {
    const info = classifyTitle(post.title || "");
    const upload = post.uploads?.[0]?.upload;
    let items: StatItem[] = [];
    if (STATS_PLATFORMS.has(platform)) {
      const r = await bundle<{ items?: StatItem[] }>(`/analytics/post?postId=${post.id}&platformType=${platform}`);
      items = r.items ?? [];
    }
    const byDay = new Map<string, StatItem>();
    for (const it of items) {
      const d = dayOf(it.createdAt);
      const prev = byDay.get(d);
      if (!prev || prev.createdAt < it.createdAt) byDay.set(d, it);
    }
    for (const [day, it] of byDay) {
      await query(
        `INSERT INTO crm_content_daily (post_id, platform, day, views, likes, comments, shares, saves)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (post_id, platform, day) DO UPDATE SET views = $4, likes = $5, comments = $6, shares = $7, saves = $8`,
        [post.id, platform, day, num(it.views), num(it.likes), num(it.comments), num(it.shares), num(it.saves)]
      );
    }
    const latest = items.reduce<StatItem | null>((a, b) => (!a || b.createdAt > a.createdAt ? b : a), null);
    const has = Boolean(latest);
    await query(
      `INSERT INTO crm_content_posts (post_id, platform, team_id, team_name, account, title, caption, format, trial, posted_at,
         permalink, thumb_url, video_seconds, views, likes, comments, shares, saves, stats_at, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, now())
       ON CONFLICT (post_id, platform) DO UPDATE SET team_name = $4, account = $5, title = $6, caption = $7, format = $8, trial = $9,
         posted_at = $10, permalink = $11, thumb_url = CASE WHEN $12 = '' THEN crm_content_posts.thumb_url ELSE $12 END,
         video_seconds = $13, views = $14, likes = $15, comments = $16, shares = $17, saves = $18, stats_at = $19, synced_at = now()`,
      [
        post.id,
        platform,
        team.id,
        team.name,
        usernames.get(`${team.id}:${platform}`) ?? "",
        info.label.slice(0, 200),
        (post.data?.[platform]?.text ?? "").slice(0, 2000),
        info.format,
        platform === "INSTAGRAM" && Boolean(post.data?.INSTAGRAM?.trialParams),
        post.postedDate || post.postDate,
        post.externalData?.[platform]?.permalink ?? "",
        upload?.iconUrl || upload?.thumbnailUrl || "",
        upload?.videoLength ? Math.round(upload.videoLength) : null,
        has ? num(latest!.views) : null,
        has ? num(latest!.likes) : null,
        has ? num(latest!.comments) : null,
        has ? num(latest!.shares) : null,
        has ? num(latest!.saves) : null,
        latest?.createdAt ?? null,
      ]
    );
  });

  const remaining = Math.max(0, due.length - refreshed);
  await query(
    `UPDATE crm_content_sync SET finished_at = now(), remaining = $1, message = $2 WHERE id = 1`,
    [remaining, remaining ? `${remaining} posts left to refresh` : "ok"]
  );
  return { posts, refreshed, remaining, accounts };
}

export async function lastSync() {
  const [row] = await query<{ started_at: string | Date | null; finished_at: string | Date | null; remaining: number; message: string }>(
    `SELECT started_at, finished_at, remaining, message FROM crm_content_sync WHERE id = 1`
  );
  return row
    ? {
        startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
        finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
        remaining: row.remaining,
        message: row.message,
      }
    : null;
}

// ---- report -------------------------------------------------------------------

export type ContentFilters = { days: number | null; account: string; platform: string; type: "all" | "trial" | "normal" };

export type ContentPost = {
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

const engagement = (p: { views: number | null; likes: number; comments: number; shares: number; saves: number }) =>
  p.views ? (p.likes + p.comments + p.shares + p.saves) / p.views : null;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function contentReport(f: ContentFilters) {
  const since = f.days ? new Date(Date.now() - f.days * 86400_000).toISOString() : null;
  const rows = await query<{
    post_id: string; platform: string; account: string; title: string; caption: string; format: string; trial: boolean;
    posted_at: string | Date | null; permalink: string; thumb_url: string; video_seconds: number | null;
    views: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null;
  }>(
    `SELECT * FROM crm_content_posts
     WHERE platform = ANY($5::text[])
       AND ($1::timestamptz IS NULL OR posted_at >= $1)
       AND ($2 = '' OR account || '|' || platform = $2)
       AND ($3 = '' OR platform = $3)
       AND ($4 = 'all' OR ($4 = 'trial' AND trial) OR ($4 = 'normal' AND NOT trial))
     ORDER BY posted_at DESC NULLS LAST`,
    [since, f.account, f.platform, f.type, [...STATS_PLATFORMS]]
  );
  const posts: ContentPost[] = rows.map((r) => {
    const base = {
      views: r.views,
      likes: r.likes ?? 0,
      comments: r.comments ?? 0,
      shares: r.shares ?? 0,
      saves: r.saves ?? 0,
    };
    return {
      id: r.post_id,
      platform: r.platform,
      account: r.account,
      title: r.title,
      caption: r.caption,
      format: r.format,
      trial: r.trial,
      postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : null,
      permalink: r.permalink,
      thumb: r.thumb_url,
      seconds: r.video_seconds,
      ...base,
      engagement: engagement(base),
    };
  });
  const measured = posts.filter((p) => p.views !== null);
  const totalViews = measured.reduce((s, p) => s + (p.views ?? 0), 0);
  const interactions = measured.reduce((s, p) => s + p.likes + p.comments + p.shares + p.saves, 0);

  // Formats.
  const byFormat = new Map<string, ContentPost[]>();
  for (const p of measured) byFormat.set(p.format, [...(byFormat.get(p.format) ?? []), p]);
  const formats = [...byFormat.entries()]
    .map(([format, ps]) => {
      const views = ps.map((p) => p.views ?? 0);
      const total = views.reduce((a, b) => a + b, 0);
      const inter = ps.reduce((s, p) => s + p.likes + p.comments + p.shares + p.saves, 0);
      const best = ps.reduce((a, b) => ((b.views ?? 0) > (a.views ?? 0) ? b : a));
      return {
        format,
        posts: ps.length,
        totalViews: total,
        avgViews: total / ps.length,
        medianViews: median(views),
        engagement: total ? inter / total : null,
        best: { title: best.title, views: best.views ?? 0, platform: best.platform, permalink: best.permalink },
      };
    })
    .sort((a, b) => b.avgViews - a.avgViews);

  // Views gained per day (from daily snapshots of the posts in view).
  const keys = new Set(rows.map((r) => `${r.post_id}|${r.platform}`));
  const daily = await query<{ post_id: string; platform: string; day: string | Date; views: number }>(
    `SELECT post_id, platform, day, views FROM crm_content_daily
     WHERE ($1::date IS NULL OR day >= $1::date - 1) ORDER BY post_id, platform, day`,
    [since ? since.slice(0, 10) : null]
  );
  const gained = new Map<string, number>();
  let prevKey = "";
  let prevViews = 0;
  for (const d of daily) {
    const k = `${d.post_id}|${d.platform}`;
    if (!keys.has(k)) continue;
    const day = typeof d.day === "string" ? d.day.slice(0, 10) : d.day.toISOString().slice(0, 10);
    const delta = k === prevKey ? Math.max(0, d.views - prevViews) : d.views;
    if (!since || day >= since.slice(0, 10)) gained.set(day, (gained.get(day) ?? 0) + delta);
    prevKey = k;
    prevViews = d.views;
  }
  const viewsByDay = [...gained.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, views]) => ({ day, views }));

  // Accounts (latest snapshot + change over the range + daily followers).
  const acc = await query<{ account_id: string; day: string | Date; platform: string; username: string; team_name: string; avatar_url: string; followers: number; views: number; likes: number; post_count: number }>(
    `SELECT * FROM crm_content_accounts ORDER BY account_id, day`
  );
  const accMap = new Map<string, typeof acc>();
  for (const a of acc) accMap.set(a.account_id, [...(accMap.get(a.account_id) ?? []), a]);
  const sinceDay = since ? since.slice(0, 10) : null;
  const dayStr = (d: string | Date) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
  const accounts = [...accMap.values()].map((list) => {
    const last = list[list.length - 1];
    const inRange = sinceDay ? list.filter((a) => dayStr(a.day) >= sinceDay) : list;
    const first = inRange[0] ?? last;
    const postsHere = measured.filter((p) => p.account === last.username && p.platform === last.platform);
    return {
      id: last.account_id,
      key: `${last.username}|${last.platform}`,
      platform: last.platform,
      username: last.username,
      team: last.team_name,
      avatar: last.avatar_url,
      followers: last.followers,
      followersChange: last.followers - first.followers,
      postCount: last.post_count,
      posts: postsHere.length,
      views: postsHere.reduce((s, p) => s + (p.views ?? 0), 0),
      series: inRange.map((a) => ({ day: dayStr(a.day), followers: a.followers })),
    };
  });

  // Options for the filter dropdowns (all accounts, not just filtered ones).
  const options = await query<{ account: string; platform: string }>(
    `SELECT DISTINCT account, platform FROM crm_content_posts WHERE account <> '' AND platform = ANY($1::text[]) ORDER BY platform, account`,
    [[...STATS_PLATFORMS]]
  );

  // By day (owner, Nov 22 2026): organic opt-ins next to what was posted
  // that day, and how many of that day's opt-ins booked a call or bought.
  // Organic = the main free course page (source free_course_application);
  // ad-funnel opt-ins are left out. Day = Eastern time, same as Analytics.
  const optRows = await query<{ day: string; opt_ins: number; booked: number; closed: number }>(
    `SELECT to_char(opt_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day,
       count(*)::int AS opt_ins,
       count(*) FILTER (WHERE status IN ('appointment', 'closed')
         OR EXISTS (SELECT 1 FROM crm_events e WHERE e.lead_id = l.id AND e.type = 'appointment'))::int AS booked,
       count(*) FILTER (WHERE status = 'closed')::int AS closed
     FROM (SELECT *, coalesce(last_opt_in_at, created_at) AS opt_at FROM crm_leads) l
     WHERE source = 'free_course_application' AND ($1::timestamptz IS NULL OR opt_at >= $1::timestamptz)
     GROUP BY 1`,
    [since]
  );
  const dayMap = new Map<string, { day: string; optIns: number; booked: number; closed: number; posts: ContentPost[] }>();
  const dayEntry = (day: string) => {
    let e = dayMap.get(day);
    if (!e) dayMap.set(day, (e = { day, optIns: 0, booked: 0, closed: 0, posts: [] }));
    return e;
  };
  for (const r of optRows) Object.assign(dayEntry(r.day), { optIns: r.opt_ins, booked: r.booked, closed: r.closed });
  for (const p of posts) if (p.postedAt) dayEntry(dayOf(p.postedAt)).posts.push(p);
  const byDay = [...dayMap.values()]
    .sort((a, b) => b.day.localeCompare(a.day))
    .map((d) => {
      const formats = new Map<string, number>();
      for (const p of d.posts) formats.set(p.format, (formats.get(p.format) ?? 0) + 1);
      return {
        day: d.day,
        optIns: d.optIns,
        booked: d.booked,
        closed: d.closed,
        bookRate: d.optIns ? d.booked / d.optIns : null,
        closeRate: d.optIns ? d.closed / d.optIns : null,
        posts: d.posts.length,
        views: d.posts.reduce((s, p) => s + (p.views ?? 0), 0),
        formats: [...formats.entries()].sort((a, b) => b[1] - a[1]).map(([format, count]) => ({ format, count })),
        items: [...d.posts].sort((a, b) => (b.views ?? -1) - (a.views ?? -1)),
      };
    });

  return {
    byDay,
    kpis: {
      posts: posts.length,
      measured: measured.length,
      totalViews,
      avgViews: measured.length ? totalViews / measured.length : 0,
      medianViews: median(measured.map((p) => p.views ?? 0)),
      engagement: totalViews ? interactions / totalViews : null,
      likes: measured.reduce((s, p) => s + p.likes, 0),
      shares: measured.reduce((s, p) => s + p.shares, 0),
    },
    posts,
    formats,
    viewsByDay,
    accounts,
    accountOptions: options.map((o) => ({ value: `${o.account}|${o.platform}`, account: o.account, platform: o.platform })),
    sync: await lastSync(),
    configured: isContentConfigured(),
  };
}
