export type SelectQuestion = {
  id: string;
  type: "select";
  question: string;
  helper?: string;
  options: string[];
};

export type TextQuestion = {
  id: string;
  type: "text";
  question: string;
  helper?: string;
  placeholder?: string;
};

export type LeadQuestion = {
  id: "lead";
  type: "lead";
  question: string;
  helper?: string;
};

export type Question = SelectQuestion | TextQuestion | LeadQuestion;

export const QUESTIONS: Question[] = [
  {
    id: "niche",
    type: "text",
    question: "What do you already know a lot about, or could talk about for hours?",
    helper: "Be as specific as you can — the more detail, the better your game plan.",
    placeholder: "e.g. budgeting for freelancers, skincare for teens, powerlifting for beginners...",
  },
  {
    id: "camera",
    type: "select",
    question: "Are you comfortable being on camera?",
    options: [
      "Yes, I love being on camera",
      "I'll do it if I have to",
      "I'd rather stay off camera",
    ],
  },
  {
    id: "audience",
    type: "select",
    question: "Do you already have a social media following?",
    options: [
      "No, I'm starting from zero",
      "A small following (under 1,000)",
      "A decent following (1,000–10,000)",
      "A solid following (10,000+)",
    ],
  },
  {
    id: "time",
    type: "select",
    question: "How much time can you realistically spend on content each week?",
    options: ["Less than 2 hours", "2–5 hours", "5–10 hours", "10+ hours"],
  },
  {
    id: "lead",
    type: "lead",
    question: "Where should we send your free game plan?",
    helper: "We'll email your personalized audit as soon as it's ready.",
  },
  {
    id: "goal",
    type: "text",
    question: "What's your main goal right now?",
    helper: "In your own words — extra income, replacing your job, building a brand, whatever it is.",
    placeholder: "e.g. I want to replace my 9-5 as a nurse and build something in wellness...",
  },
  {
    id: "monthlyIncome",
    type: "select",
    question: "How much are you currently making per month?",
    options: ["$0 — I'm just starting out", "Under $1,000", "$1,000–$5,000", "$5,000+"],
  },
  {
    id: "aiExperience",
    type: "select",
    question: "How would you describe your experience with AI tools like ChatGPT?",
    options: ["Total beginner", "I've used them a little", "I use them regularly"],
  },
  {
    id: "timeline",
    type: "select",
    question: "How fast do you want to start seeing results?",
    options: [
      "ASAP, I'm ready to grind",
      "Within the next few months",
      "No rush, just exploring",
    ],
  },
];
