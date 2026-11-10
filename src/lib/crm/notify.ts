import "server-only";

// Posts missed-call alerts to Slack and Discord through their incoming
// webhooks. Each one is skipped while its env var is unset:
//   SLACK_MISSED_CALL_WEBHOOK_URL   (Slack app → Incoming Webhooks)
//   DISCORD_MISSED_CALL_WEBHOOK_URL (Discord channel → Integrations → Webhooks)

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.brandacquisition.co").replace(/\/$/, "");
}

async function post(url: string | undefined, body: unknown, label: string) {
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`${label} webhook answered ${res.status}`);
  } catch (error) {
    console.error(`${label} webhook failed:`, error);
  }
}

// Sends the same message to both. `text` is plain text with no markup.
export async function notifyTeam(text: string) {
  const link = `${siteUrl()}/crm`;
  await Promise.all([
    post(
      process.env.SLACK_MISSED_CALL_WEBHOOK_URL,
      // Escaped so a name like "<!channel>" can't ping anyone.
      { text: `${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}\n<${link}|Open the CRM>` },
      "Slack"
    ),
    post(
      process.env.DISCORD_MISSED_CALL_WEBHOOK_URL,
      // No pings, whatever the lead's name contains.
      { content: `${text}\n${link}`, allowed_mentions: { parse: [] } },
      "Discord"
    ),
  ]);
}

export function missedCallText(name: string | null, phone: string, list: string | null) {
  const who = name ? `"${name}"` : "an unknown number";
  return `📞 We have a missed call from ${who} (${phone})${list ? ` · ${list}` : ""}. Call them back!`;
}
