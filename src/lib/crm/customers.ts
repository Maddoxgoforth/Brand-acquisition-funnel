import "server-only";

import { CUSTOMER_STATUSES, customerStatusLabel, type Actor, type CustomerStatusId, type Lead } from "./constants";
import { query } from "./db";
import { getLead, leadFromRow, type LeadRow } from "./leads";

// Customers board (owner, Nov 24 2026). Every closed lead lands here in
// "Closed · Base44", owned by whoever closed it. 7 days after the sale it
// moves itself to Check-in and Slack + Discord get a ping, so the closer
// calls with the 7-day check-in script and books a strategy call for the
// mid-ticket (group coaching) or high-ticket (1-on-1) program. Not interested
// comes back to Check-in 14 days later, with another ping.
export const CHECKIN_AFTER_DAYS = 7;
export const RETRY_AFTER_DAYS = 14;

export async function listCustomers(): Promise<Lead[]> {
  await moveDueCheckins().catch((e) => console.error("Customer check-ins failed", e));
  const rows = await query<LeadRow>(
    `SELECT * FROM crm_leads WHERE cust_status IS NOT NULL ORDER BY coalesce(cust_moved_at, closed_at, updated_at) DESC`
  );
  return rows.map(leadFromRow);
}

export class NotACustomerError extends Error {}

// Moves a customer to another column. Not interested schedules the next
// check-in 14 days out; Closed · Base44 schedules one 7 days out; every other
// column has none.
export async function setCustomerStatus(id: string, to: CustomerStatusId, actor: Actor): Promise<Lead | null> {
  const current = await getLead(id);
  if (!current) return null;
  if (!current.customerStatus) throw new NotACustomerError("This lead isn't on the Customers board.");
  if (current.customerStatus === to) return current;
  const days = to === "not_interested" ? RETRY_AFTER_DAYS : to === "base44" ? CHECKIN_AFTER_DAYS : null;
  const rows = await query<LeadRow>(
    `UPDATE crm_leads
     SET cust_status = $2,
         cust_next_at = CASE WHEN $3::int IS NULL THEN NULL ELSE now() + $3::int * interval '1 day' END,
         cust_moved_at = now(), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, to, days]
  );
  await query(
    `INSERT INTO crm_events (lead_id, type, data, actor_id, actor_name)
     VALUES ($1, 'customer', $2::jsonb, $3, $4)`,
    [id, JSON.stringify({ from: current.customerStatus, to }), actor.id, actor.name]
  );
  return rows[0] ? leadFromRow(rows[0]) : null;
}

let lastSweep = 0;

// Customers whose 7 days (after the sale) or 14 days (after Not interested)
// are up move to Check-in, and Slack + Discord hear about it. SKIP LOCKED
// keeps two servers from moving (and announcing) the same customer.
export async function moveDueCheckins(force = false) {
  if (!force && Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const moved = await query<{ id: string; name: string; from_status: string; claimed_by_name: string | null }>(
    `WITH due AS (
       SELECT id, cust_status FROM crm_leads
       WHERE cust_status IN ('base44', 'not_interested') AND cust_next_at <= now()
       FOR UPDATE SKIP LOCKED
     ), moved AS (
       UPDATE crm_leads l
       SET cust_status = 'checkin', cust_next_at = NULL, cust_moved_at = now(), updated_at = now()
       FROM due WHERE l.id = due.id
       RETURNING l.id, l.name, l.claimed_by_name, due.cust_status AS from_status
     ), logged AS (
       INSERT INTO crm_events (lead_id, type, data, actor_id, actor_name)
       SELECT id, 'customer', jsonb_build_object('from', from_status, 'to', 'checkin', 'auto', 'yes'), 'system', 'CRM'
       FROM moved
     )
     SELECT id, name, from_status, claimed_by_name FROM moved`
  );
  if (moved.length) await announceCheckins(moved);
}

const slackText = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One Slack + one Discord message per sweep, listing everyone who moved.
// CUSTOMER_*_WEBHOOK_URL send them to their own channel; otherwise they go
// where new opt-ins are posted. Best effort: a failed post never blocks.
async function announceCheckins(moved: { name: string; from_status: string; claimed_by_name: string | null }[]) {
  const line = (m: (typeof moved)[number]) =>
    `${m.name || "A customer"}${m.claimed_by_name ? ` (${m.claimed_by_name})` : ""}${
      m.from_status === "not_interested" ? " · 14-day retry" : " · 7 days since Base44"
    }`;
  const lines = moved.slice(0, 25).map(line);
  if (moved.length > 25) lines.push(`…and ${moved.length - 25} more`);
  const title = `📞 ${moved.length === 1 ? "1 customer" : `${moved.length} customers`} moved to ${customerStatusLabel("checkin")}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.brandacquisition.co").replace(/\/$/, "");

  const slack = process.env.CUSTOMER_SLACK_WEBHOOK_URL || process.env.SLACK_FREE_COURSE_WEBHOOK_URL;
  const discord = process.env.CUSTOMER_DISCORD_WEBHOOK_URL || process.env.DISCORD_FREE_COURSE_WEBHOOK_URL;
  await Promise.all([
    slack
      ? fetch(slack, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `<!channel> ${title}`,
            blocks: [
              { type: "section", text: { type: "mrkdwn", text: `<!channel> *${slackText(title)}*` } },
              { type: "section", text: { type: "mrkdwn", text: lines.map((l) => `• ${slackText(l)}`).join("\n") } },
              { type: "context", elements: [{ type: "mrkdwn", text: `<${site}/crm|Open the CRM> → Customers and call them.` }] },
            ],
          }),
        }).catch((e) => console.error("Slack check-in post failed", e))
      : null,
    discord
      ? fetch(discord, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title,
                description: `${lines.map((l) => `• ${l}`).join("\n")}\n\nOpen the CRM → Customers and call them.`.slice(0, 4000),
                color: 0x16a34a,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }).catch((e) => console.error("Discord check-in post failed", e))
      : null,
  ]);
}

export const CUSTOMER_COLUMNS = CUSTOMER_STATUSES;
