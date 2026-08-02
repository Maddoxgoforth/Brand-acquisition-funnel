export type SelectQuestion = {
  id: string;
  type: "select";
  question: string;
  helper?: string;
  options: string[];
};

export type LeadQuestion = {
  id: "lead";
  type: "lead";
  question: string;
  helper?: string;
};

export type Question = SelectQuestion | LeadQuestion;

export const QUESTIONS: Question[] = [
  {
    id: "niche",
    type: "select",
    question: "What do you already know a lot about, or could talk about for hours?",
    options: [
      "Fitness & Health",
      "Beauty & Skincare",
      "Business & Money",
      "Gaming",
      "Fashion & Style",
      "Self-Improvement",
      "Tech & AI",
      "Something else",
    ],
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
    id: "platform",
    type: "select",
    question: "Which platform do you want to grow first?",
    options: ["TikTok", "Instagram", "YouTube", "Not sure yet"],
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
    type: "select",
    question: "What's your main goal right now?",
    options: [
      "Make extra income on the side",
      "Replace my current income",
      "Build a long-term brand",
    ],
  },
  {
    id: "budget",
    type: "select",
    question: "What's your budget to get started (tools, ads, etc.)?",
    options: ["Under $100", "$100–$500", "$500–$2,000", "$2,000+"],
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
