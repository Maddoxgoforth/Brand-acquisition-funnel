import { NextResponse } from "next/server";

import { addLeads } from "@/lib/crm/leads";

type LeadBody = {
  name: string;
  email: string;
  phone: string;
};

async function sendToDiscord(lead: LeadBody) {
  const webhookUrl = process.env.DISCORD_FREE_COURSE_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🎉 New Free Course Lead",
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
async function sendToSlack(lead: LeadBody, crmUrl: string) {
  const webhookUrl = process.env.SLACK_FREE_COURSE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const summary = `New free course application: ${slackText(lead.name)}`;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: summary,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `:tada: *${summary}*` },
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

// Files the lead under "Free course applications" in the private CRM
// (/crm). Best-effort like the Discord step: if the CRM database is missing
// or down, the visitor still gets their confirmation page.
async function saveToCrm(lead: LeadBody) {
  try {
    await addLeads(
      "free_course_application",
      [{ name: lead.name, email: lead.email, phone: lead.phone, extra: {} }],
      "free-course form"
    );
  } catch (error) {
    console.error("Saving free-course lead to CRM failed:", error);
  }
}

export async function POST(request: Request) {
  let body: LeadBody;
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

  const crmUrl = new URL("/crm", request.url).toString();
  await Promise.all([
    sendToDiscord({ name, email, phone }),
    sendToSlack({ name, email, phone }, crmUrl),
    saveToCrm({ name, email, phone }),
  ]);

  return NextResponse.json({ ok: true });
}
