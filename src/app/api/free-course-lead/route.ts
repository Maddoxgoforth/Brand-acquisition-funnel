import { NextResponse } from "next/server";

import { addLeads, recordSiteEvent } from "@/lib/crm/leads";
import { requestContext, sendMetaEvent } from "@/lib/meta";

type LeadBody = {
  name: string;
  email: string;
  phone: string;
};

// Which page the opt-in came from: "organic" = the main free course page,
// "ads" = the /free-training quiz funnel for cold traffic.
type Funnel = "organic" | "ads";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "fbc",
  "fbp",
  "landing_page",
  "landing_url",
];

function pickStrings(input: unknown, keys?: string[], max = 500) {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    if (keys && !keys.includes(key)) continue;
    if (typeof value === "string" && value.trim()) out[key.slice(0, 80)] = value.trim().slice(0, max);
  }
  return out;
}

async function sendToDiscord(lead: LeadBody, funnel: Funnel) {
  const webhookUrl = process.env.DISCORD_FREE_COURSE_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: funnel === "ads" ? "🎯 New Free Course Lead (Ad)" : "🎉 New Free Course Lead",
            color: 0x2563eb,
            fields: [
              { name: "Name", value: lead.name, inline: true },
              { name: "Email", value: lead.email, inline: true },
              { name: "Phone", value: lead.phone, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status}`);
    }
  } catch (error) {
    console.error("Discord webhook request failed:", error);
  }
}

// Slack's message formatting treats <...> as links and @-mentions, so a
// visitor typing "<!channel>" as their name could ping everyone. Escape it.
function slackText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Same best-effort pattern as Discord: skipped when the env var is unset,
// and a Slack failure never blocks the visitor.
async function sendToSlack(lead: LeadBody, crmUrl: string, funnel: Funnel) {
  const webhookUrl = process.env.SLACK_FREE_COURSE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const summary = `New free course ${funnel === "ads" ? "ad opt-in" : "application"}: ${slackText(lead.name)}`;
  // <!channel> is Slack's @channel: it notifies everyone in the channel,
  // including a push to their phones, so leads get called fast. `text` is
  // what the phone notification shows.
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `<!channel> ${summary}`,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `<!channel> :tada: *${summary}*` },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Name*\n${slackText(lead.name)}` },
              { type: "mrkdwn", text: `*Phone*\n${slackText(lead.phone)}` },
              { type: "mrkdwn", text: `*Email*\n${slackText(lead.email)}` },
            ],
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `<${crmUrl}|Open the CRM> to call them.` },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`Slack webhook failed: ${res.status}`);
    }
  } catch (error) {
    console.error("Slack webhook request failed:", error);
  }
}

// Files the lead in the private CRM (/crm): "Organic opt-ins" or "Ad
// opt-ins", with the quiz answers as extra info and the ad source. Best-effort
// like the Discord step: if the CRM database is missing or down, the visitor
// still gets their confirmation page.
async function saveToCrm(
  lead: LeadBody,
  funnel: Funnel,
  answers: Record<string, string>,
  attribution: Record<string, string>
) {
  try {
    await addLeads(
      funnel === "ads" ? "ad_free_course_application" : "free_course_application",
      [{ name: lead.name, email: lead.email, phone: lead.phone, extra: answers, attribution }],
      funnel === "ads" ? "ad funnel form" : "free-course form"
    );
  } catch (error) {
    console.error("Saving free-course lead to CRM failed:", error);
  }
}

export async function POST(request: Request) {
  let body: LeadBody & {
    funnel?: unknown;
    answers?: unknown;
    attribution?: unknown;
    eventId?: unknown;
    visitor?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, phone } = body;
  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const funnel: Funnel = body.funnel === "ads" ? "ads" : "organic";
  const answers = pickStrings(body.answers, undefined, 300);
  const { ip, userAgent } = requestContext(request);
  const attribution: Record<string, string> = {
    ...pickStrings(body.attribution, ATTRIBUTION_KEYS),
    ...(ip ? { ip } : {}),
    ...(userAgent ? { user_agent: userAgent.slice(0, 400) } : {}),
  };
  const eventId =
    typeof body.eventId === "string" && body.eventId ? body.eventId.slice(0, 100) : crypto.randomUUID();

  const crmUrl = new URL("/crm", request.url).toString();
  await Promise.all([
    sendToDiscord({ name, email, phone }, funnel),
    sendToSlack({ name, email, phone }, crmUrl, funnel),
    saveToCrm({ name, email, phone }, funnel, answers, attribution),
    // Same event id as the browser Pixel's Lead event, so Meta counts it once.
    sendMetaEvent({
      name: "Lead",
      eventId,
      url: attribution.landing_url || request.headers.get("referer") || undefined,
      user: {
        email,
        phone,
        firstName: name,
        ip,
        userAgent,
        fbc: attribution.fbc,
        fbp: attribution.fbp,
      },
      customData: { lead_source: funnel === "ads" ? "ad_funnel" : "organic" },
    }),
    typeof body.visitor === "string" && body.visitor
      ? recordSiteEvent(body.visitor, funnel, "optin", attribution.utm_campaign ?? "").catch(() => {})
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true });
}
