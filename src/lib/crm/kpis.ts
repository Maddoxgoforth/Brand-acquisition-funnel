import "server-only";

import { query } from "./db";

// Closer KPIs and strikes (owner, Nov 24 2026).
//  - Daily: 75 dials every day, weekends included (Eastern time; owner,
//    Nov 24 2026). Missing it = 1 strike.
//  - Plan mix: at least 30% yearly plans (Starter Yearly or Builder Yearly)
//    over each closer's last 10 closes. Checked when a week ends (Sunday,
//    Eastern) if they closed something that week; under 30% = 1 strike.
//  - Strikes expire 30 days after they're given. 3 active strikes = fired
//    (the CRM flags it; the owner decides and deactivates the account).
// Only results from KPI_START on count, so nobody gets strikes for days before
// the rules existed. Applies to active team members who can dial (not the
// owner). The owner can remove a strike (excused day) or add one by hand.
export const KPI = {
  start: "2026-11-25",
  dialsPerDay: 75,
  yearlyShare: 0.3,
  mixWindow: 10,
  strikeDays: 30,
  strikesToFire: 3,
} as const;

const TZ = "America/New_York";
const YEARLY_PLANS = ["yearly", "builder_yearly"];

export type Strike = {
  id: string;
  kind: "dials" | "plan_mix" | "manual";
  reason: string;
  createdAt: string;
  expiresAt: string;
  removedAt: string | null;
  removedBy: string | null;
  active: boolean;
};

export type KpiPerson = {
  userId: string;
  name: string;
  dialsToday: number;
  dialsYesterday: number | null; // null when yesterday wasn't a workday
  weekDays: { date: string; dials: number; workday: boolean; future: boolean }[];
  mix: { yearly: number; closes: number; share: number | null };
  activeStrikes: number;
  strikes: Strike[];
};

// Today's date in Eastern time, as YYYY-MM-DD.
function etToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// Every day is a dial day, weekends included (owner, Nov 24 2026).
const isWorkday = (date: string) => date.length === 10;
const mondayOf = (date: string) => {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
};
const label = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

let lastSweep = 0;

// Gives the strikes that are due: one per missed weekday and one per finished
// week under the yearly mix. Safe to run any time (each strike has a unique
// period, so it's never given twice, and a removed strike stays removed).
export async function giveDueStrikes(force = false) {
  if (!force && Date.now() - lastSweep < 10 * 60_000) return;
  lastSweep = Date.now();
  const today = etToday();
  if (today <= KPI.start) return;

  // Missed dial days: every day from the start (or the day they joined)
  // through yesterday with fewer than 75 dials.
  await query(
    `WITH days AS (
       SELECT d::date AS d FROM generate_series($1::date, $2::date - 1, interval '1 day') d
     ), people AS (
       SELECT id, (created_at AT TIME ZONE '${TZ}')::date AS joined
       FROM crm_users WHERE status = 'active' AND can_dial
     ), dials AS (
       SELECT actor_id, (created_at AT TIME ZONE '${TZ}')::date AS d, count(*)::int AS n
       FROM crm_events
       WHERE type = 'call' AND created_at >= ($1::date)::timestamp AT TIME ZONE '${TZ}'
       GROUP BY 1, 2
     )
     INSERT INTO crm_strikes (user_id, kind, period, reason)
     SELECT p.id, 'dials', days.d::text,
            coalesce(x.n, 0) || ' dials on ' || to_char(days.d, 'Dy Mon FMDD') || ' (needs ' || $3::int || ')'
     FROM people p CROSS JOIN days
     LEFT JOIN dials x ON x.actor_id = p.id::text AND x.d = days.d
     WHERE days.d > p.joined AND coalesce(x.n, 0) < $3::int
     ON CONFLICT (user_id, kind, period) DO NOTHING`,
    [KPI.start, today, KPI.dialsPerDay]
  );

  // Plan mix, checked for each finished week (Mon–Sun) since the start.
  const closes = await query<{ user_id: string; plan: string; day: string }>(
    `SELECT l.closed_by_id AS user_id, l.close_plan AS plan,
            to_char((l.closed_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS day
     FROM crm_leads l JOIN crm_users u ON u.id::text = l.closed_by_id
     WHERE l.status = 'closed' AND l.closed_at IS NOT NULL AND l.close_plan IS NOT NULL
       AND u.status = 'active' AND u.can_dial
       AND l.closed_at >= ($1::date)::timestamp AT TIME ZONE '${TZ}'
     ORDER BY l.closed_at`,
    [KPI.start]
  );
  const byUser = new Map<string, { plan: string; day: string }[]>();
  for (const c of closes) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
    byUser.get(c.user_id)!.push(c);
  }
  const thisMonday = mondayOf(today);
  for (const [userId, list] of byUser) {
    for (let monday = mondayOf(KPI.start); monday < thisMonday; monday = addDays(monday, 7)) {
      const sunday = addDays(monday, 6);
      const upTo = list.filter((c) => c.day <= sunday);
      if (!upTo.some((c) => c.day >= monday)) continue; // no new closes that week
      const window = upTo.slice(-KPI.mixWindow);
      if (window.length < KPI.mixWindow) continue;
      const yearly = window.filter((c) => YEARLY_PLANS.includes(c.plan)).length;
      if (yearly / window.length >= KPI.yearlyShare) continue;
      await query(
        `INSERT INTO crm_strikes (user_id, kind, period, reason) VALUES ($1, 'plan_mix', $2, $3)
         ON CONFLICT (user_id, kind, period) DO NOTHING`,
        [
          userId,
          monday,
          `Only ${yearly} of last ${window.length} closes were yearly (${Math.round((yearly / window.length) * 100)}%, needs 30%) — week of ${label(monday)}`,
        ]
      );
    }
  }
}

export async function kpiReport(onlyUserId: string | null): Promise<{ rules: typeof KPI; today: string; people: KpiPerson[] }> {
  await giveDueStrikes();
  const today = etToday();
  const monday = mondayOf(today);
  const yesterday = addDays(today, -1);

  const people = await query<{ id: string; name: string }>(
    `SELECT id::text AS id, name FROM crm_users
     WHERE status = 'active' AND can_dial AND ($1::text IS NULL OR id::text = $1)
     ORDER BY name`,
    [onlyUserId]
  );
  if (!people.length) return { rules: KPI, today, people: [] };
  const ids = people.map((p) => p.id);

  const [dials, closes, strikes] = await Promise.all([
    query<{ actor_id: string; d: string; n: number }>(
      `SELECT actor_id, to_char((created_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS d, count(*)::int AS n
       FROM crm_events
       WHERE type = 'call' AND actor_id = ANY($1::text[])
         AND created_at >= ($2::date)::timestamp AT TIME ZONE '${TZ}'
       GROUP BY 1, 2`,
      [ids, yesterday < monday ? yesterday : monday]
    ),
    query<{ user_id: string; plan: string }>(
      `SELECT closed_by_id AS user_id, close_plan AS plan FROM crm_leads
       WHERE status = 'closed' AND close_plan IS NOT NULL AND closed_by_id = ANY($1::text[])
         AND closed_at >= ($2::date)::timestamp AT TIME ZONE '${TZ}'
       ORDER BY closed_at`,
      [ids, KPI.start]
    ),
    query<{
      id: string; user_id: string; kind: Strike["kind"]; reason: string;
      created_at: string | Date; removed_at: string | Date | null; removed_by: string | null;
    }>(
      `SELECT id::text AS id, user_id::text AS user_id, kind, reason, created_at, removed_at, removed_by
       FROM crm_strikes WHERE user_id::text = ANY($1::text[])
         AND created_at > now() - interval '90 days'
       ORDER BY created_at DESC`,
      [ids]
    ),
  ]);

  const count = (id: string, d: string) => dials.find((x) => x.actor_id === id && x.d === d)?.n ?? 0;
  const iso = (v: string | Date) => new Date(v).toISOString();

  return {
    rules: KPI,
    today,
    people: people.map((p) => {
      const mine = closes.filter((c) => c.user_id === p.id).slice(-KPI.mixWindow);
      const yearly = mine.filter((c) => YEARLY_PLANS.includes(c.plan)).length;
      const list: Strike[] = strikes
        .filter((s) => s.user_id === p.id)
        .map((s) => {
          const expires = new Date(new Date(s.created_at).getTime() + KPI.strikeDays * 86400_000);
          return {
            id: s.id,
            kind: s.kind,
            reason: s.reason,
            createdAt: iso(s.created_at),
            expiresAt: expires.toISOString(),
            removedAt: s.removed_at ? iso(s.removed_at) : null,
            removedBy: s.removed_by,
            active: !s.removed_at && expires.getTime() > Date.now(),
          };
        });
      return {
        userId: p.id,
        name: p.name,
        dialsToday: count(p.id, today),
        dialsYesterday: isWorkday(yesterday) ? count(p.id, yesterday) : null,
        weekDays: Array.from({ length: 7 }, (_, i) => {
          const d = addDays(monday, i);
          return { date: d, dials: count(p.id, d), workday: isWorkday(d), future: d > today };
        }),
        mix: { yearly, closes: mine.length, share: mine.length ? yearly / mine.length : null },
        activeStrikes: list.filter((s) => s.active).length,
        strikes: list,
      };
    }),
  };
}

export async function addStrike(userId: string, reason: string) {
  await query(
    `INSERT INTO crm_strikes (user_id, kind, period, reason) VALUES ($1, 'manual', gen_random_uuid()::text, $2)`,
    [userId, reason.slice(0, 300)]
  );
}

export async function setStrikeRemoved(id: string, removed: boolean, by: string) {
  await query(
    `UPDATE crm_strikes SET removed_at = CASE WHEN $2 THEN now() ELSE NULL END,
            removed_by = CASE WHEN $2 THEN $3 ELSE NULL END
     WHERE id = $1`,
    [id, removed, by]
  );
}
