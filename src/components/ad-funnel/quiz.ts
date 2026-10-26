// The /free-training quiz (cold traffic from ads). Copy lives here, like the
// rest of the site's "copy in arrays" convention. Each answer's `label` is
// what gets saved on the CRM lead (extra info, under the question's `crm`
// name), so closers see it before they call.

export type Option = { id: string; label: string; emoji?: string };

export type Question = {
  id: string;
  crm: string; // label shown on the CRM lead
  title: string;
  kicker?: string; // small line above the question
  note?: string; // small line under the title
  multi?: boolean;
  letters?: boolean; // show A/B/C/D badges instead of emoji
  options: Option[];
};

export const QUESTIONS: Question[] = [
  {
    id: "commit",
    crm: "Committed to the quiz",
    kicker: "🎁 Congrats! You're getting my free course at the end of this quiz.",
    note: "Finish the next few steps to unlock it.",
    title: "Do you commit to finishing this quick quiz?",
    options: [
      { id: "yes", label: "Yes", emoji: "✅" },
      { id: "no", label: "No", emoji: "🚫" },
    ],
  },
  {
    id: "age",
    crm: "Age",
    title: "How old are you?",
    letters: true,
    options: [
      { id: "u18", label: "Under 18" },
      { id: "18-24", label: "18 - 24" },
      { id: "25-34", label: "25 - 34" },
      { id: "35+", label: "35+" },
    ],
  },
  {
    id: "situation",
    crm: "Right now",
    title: "What best describes you right now?",
    options: [
      { id: "school", label: "In school", emoji: "🎓" },
      { id: "job", label: "Working a job I don't love", emoji: "💼" },
      { id: "between", label: "Between jobs", emoji: "🔁" },
      { id: "own", label: "Already doing my own thing", emoji: "🚀" },
    ],
  },
  {
    id: "goal",
    crm: "Main goal",
    title: "What's your main goal right now?",
    options: [
      { id: "side", label: "Make money on the side", emoji: "💸" },
      { id: "quit", label: "Quit my 9-5", emoji: "🏃" },
      { id: "brand", label: "Build a personal brand", emoji: "📱" },
      { id: "freedom", label: "Work from anywhere", emoji: "🌍" },
      { id: "prove", label: "Prove people wrong", emoji: "🔥" },
    ],
  },
  {
    id: "why",
    crm: "What's pushing them",
    title: "What's pushing you to start now?",
    note: "Pick all that apply.",
    multi: true,
    options: [
      { id: "broke", label: "Tired of being broke" },
      { id: "job", label: "I hate my job" },
      { id: "time", label: "Freedom with my time" },
      { id: "family", label: "Help my family" },
      { id: "prove", label: "Prove something to myself" },
    ],
  },
  {
    id: "experience",
    crm: "Experience",
    title: "Have you tried making money online before?",
    options: [
      { id: "never", label: "Never, this is my first shot", emoji: "🌱" },
      { id: "tried", label: "Tried, it didn't stick", emoji: "🔁" },
      { id: "posting", label: "I post, but nobody watches", emoji: "📱" },
      { id: "some", label: "I've made some money already", emoji: "📈" },
    ],
  },
  {
    id: "time",
    crm: "Time per day",
    title: "How much time per day can you put into this?",
    options: [
      { id: "30m", label: "30 min (start slow)", emoji: "⏱️" },
      { id: "1-2h", label: "1-2 hours (ideal)", emoji: "🔥" },
      { id: "2-4h", label: "2-4 hours (serious)", emoji: "💪" },
      { id: "4h+", label: "4+ hours (all in)", emoji: "🚀" },
    ],
  },
  {
    id: "target",
    crm: "90-day goal",
    title: "What would a win look like in the next 90 days?",
    options: [
      { id: "1k", label: "My first $1K online", emoji: "💵" },
      { id: "5k", label: "$5K months", emoji: "💰" },
      { id: "10k", label: "$10K months", emoji: "🏆" },
      { id: "replace", label: "Replace my income completely", emoji: "🚀" },
    ],
  },
];

export type Answers = Record<string, string[]>; // question id → option ids

// Answers as CRM-readable text: { "Main goal": "Quit my 9-5", ... }
export function answersForCrm(answers: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const picked = answers[q.id];
    if (!picked?.length) continue;
    out[q.crm] = picked
      .map((id) => q.options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  }
  return out;
}

const pick = (answers: Answers, id: string) => answers[id]?.[0];

// The personalized plan shown after the quiz.
export function buildPlan(answers: Answers) {
  const exp = pick(answers, "experience");
  const level =
    exp === "some" ? "Intermediate" : exp === "posting" ? "Getting started" : "Beginner";
  const today =
    exp === "some"
      ? "Making some money"
      : exp === "posting"
        ? "Posting, no traction yet"
        : exp === "tried"
          ? "Tried before, starting fresh"
          : "Complete beginner";

  const target = pick(answers, "target");
  const milestone =
    target === "1k"
      ? "your first $1K online"
      : target === "5k"
        ? "your first $5K month"
        : target === "replace"
          ? "replacing your income"
          : "your first $10K month";

  const time = pick(answers, "time");
  const pace =
    time === "30m"
      ? "30 minutes a day: one short video a day, and building your product on weekends."
      : time === "1-2h"
        ? "1-2 hours a day: the ideal pace. One or two videos a day plus your product."
        : time === "2-4h"
          ? "2-4 hours a day: you can move through each phase faster than most."
          : time === "4h+"
            ? "4+ hours a day: all in. You can stack phases and post multiple times a day."
            : "Whatever time you have: consistency beats hours.";

  const phases = [
    {
      when: "Weeks 1-2",
      title: "Build your personal brand",
      body: "Pick your niche, set up your accounts, and post your first videos, even with 0 followers.",
    },
    {
      when: "Weeks 3-6",
      title: "Create your first digital product",
      body: "Use AI tools to build a product your audience actually wants, without being a tech person.",
    },
    {
      when: "Weeks 7-12",
      title: `Sell it and push toward ${milestone}`,
      body: "Turn your views into sales with the same content-to-checkout system I use myself.",
    },
  ];

  return { level, today, milestone, pace, phases };
}

// Shared with the video page, so the opt-in carries the quiz answers.
export const ANSWERS_KEY = "ba_quiz";
