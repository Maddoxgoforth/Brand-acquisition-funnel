import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const runtime = "nodejs";

const GamePlanSchema = z.object({
  niche: z.string(),
  videoIdeas: z.array(z.string()).min(2).max(3),
  productIdeas: z.array(z.string()).length(3),
});

type RequestBody = {
  answers: Record<string, string>;
  lead: { name: string; email: string; phone: string };
};

async function generateGamePlan(answers: Record<string, string>) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You are Maddox's content strategist. Based on a short quiz, generate a free, personalized 'content audit' game plan for someone who wants to build a personal brand and sell a high-ticket info product or program in their niche. Be specific and encouraging, avoid generic filler, and tailor everything to their actual answers. Video ideas should be concrete, postable-tomorrow ideas, not vague themes, and should mostly be about their actual niche - at most one of the ideas should be about using AI tools within that niche, the rest should have nothing to do with AI. Product ideas should be specific high-ticket ($2,000-$4,000) digital product concepts (courses, mentorship, coaching programs, done-for-you systems) built around their niche and expertise, tailored to their current income, existing audience size, and experience level - at most one of the three product ideas can be AI-focused, the other two must be purely about their niche with no AI angle at all. Do not make every idea about AI just because Maddox himself uses AI as a tool in his own business; the person's own niche and expertise should drive almost all of the ideas.",
      },
      {
        role: "user",
        content: JSON.stringify(answers),
      },
    ],
    text: { format: zodTextFormat(GamePlanSchema, "game_plan") },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI returned no parsed output");
  }
  return response.output_parsed;
}

async function sendToConvertKit(
  lead: { name: string; email: string; phone: string },
  plan: z.infer<typeof GamePlanSchema>
) {
  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;
  if (!apiKey || !formId) {
    throw new Error("ConvertKit is not configured");
  }

  const upsertRes = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": apiKey,
    },
    body: JSON.stringify({
      first_name: lead.name,
      email_address: lead.email,
      state: "active",
      fields: {
        phone_number: lead.phone,
        niche: plan.niche,
        video_ideas: plan.videoIdeas.map((v, i) => `${i + 1}) ${v}`).join(" "),
        product_ideas: plan.productIdeas
          .map((v, i) => `${i + 1}) ${v}`)
          .join(" "),
      },
    }),
  });

  if (!upsertRes.ok) {
    throw new Error(`ConvertKit subscriber upsert failed: ${upsertRes.status}`);
  }

  const formRes = await fetch(
    `https://api.kit.com/v4/forms/${formId}/subscribers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({ email_address: lead.email }),
    }
  );

  if (!formRes.ok) {
    throw new Error(`ConvertKit form subscribe failed: ${formRes.status}`);
  }
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { answers, lead } = body;
  if (!answers || !lead?.name || !lead?.email || !lead?.phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const plan = await generateGamePlan(answers);
    await sendToConvertKit(lead, plan);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("content-audit submission failed:", error);
    return NextResponse.json(
      { error: "Failed to generate or send game plan" },
      { status: 500 }
    );
  }
}
