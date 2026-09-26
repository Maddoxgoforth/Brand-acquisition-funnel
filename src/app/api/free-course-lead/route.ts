import { NextResponse } from "next/server";

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

  await sendToDiscord({ name, email, phone });

  return NextResponse.json({ ok: true });
}
