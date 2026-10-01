import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import CopyBlock from "@/components/ui/CopyBlock";

type Block = { mode: string; text: string };

type Step = {
  number: number;
  title: string;
  before?: string[];
  blocks?: Block[];
  after?: string[];
};

const STEPS: Step[] = [
  {
    number: 1,
    title: "Get in",
    before: [
      "Go to base44.com, sign in with the email you signed up with. No account? Make one with that email.",
      'Apps tab, new app. Next to the send button, find the mode toggle: Discuss and Build. If yours says Plan and Edit, same thing. Each prompt below is labeled with the mode it goes in.',
    ],
  },
  {
    number: 2,
    title: "The foundation paste",
    before: ["Discuss mode. This one block is the entire spec. Send it exactly as it is."],
    blocks: [
      {
        mode: "DISCUSS",
        text: `I am building my Creator OS. A personal dashboard that runs my life, my money, my health, my time, my goals, my habits, and my why, while I build my business selling digital products with AI. This message is the full spec. Plan it with me before you build anything, and treat every decision below as final, so you only ask me about real gaps.

WHAT IT IS
One private app. Single user, just me. One home dashboard plus six rooms: Money, Health, Calendar, Goals, Habits, Why.

WHAT IT STORES
- DailyLog: date, money spent, trained yes or no, hours slept, one thing I shipped (business or otherwise), short note
- MoneySnapshot: month, income, fixed costs, total debt, total saved
- Goal: horizon (90 day, 1 year, 3 year), the goal in one line, progress percent
- Habit: name, trigger, current streak, last done date
- TimeBlock: day, category, hours
- WhyItem: who or what, one line about them

LAYOUT AND STYLE
- Home dashboard, top to bottom: my Momentum Score, my 30 day streak grid built from DailyLogs with my current streak and my best streak ever shown side by side, my 90 day goal front and center, one row of freshness badges for all six rooms, then my Why panel.
- Momentum Score is one number from 0 to 100, computed daily as an even blend of my current streak percent against target, my 90 day goal progress percent, and my best habit's streak percent against its own target. Show it big, with a one line label like "Momentum: 72, trending up" based on whether it rose or fell since 3 days ago.
- Freshness badges show days since that room's last record: 0 to 1 green, 2 to 3 amber, 4 plus red.
- Rooms show their data as a card based grid. Big numbers, small labels.
- Dark theme, high contrast, minimal. Mobile first: the home screen must read on a phone in ten seconds.

THE RULE THAT MATTERS MOST
- NO forms and NO input fields anywhere. No add, edit, or delete buttons. The app is read only. Every piece of data enters by me telling you in this chat.
- A room with no data yet says: Tell me in chat. Never an empty form.

WHAT NOT TO ADD
- No user accounts, sign ups, or profiles. Just me.
- No automatic weekly or daily summaries, and no insight pushes into the chat. I run my own reviews by prompting. Two exceptions are allowed: goal milestone alerts, and streak milestone alerts.
- No notifications from the app itself beyond those two exceptions. My reminder system comes later and lives outside this app.
- No extra pages, settings screens, or features beyond this spec.

If you ask me planning questions, assume whichever answer matches this spec. Ask me only about genuine gaps. Then show me the plan.`,
      },
    ],
    after: [
      "It answers with a plan card. View, then Start Building. Never Skip plan. If it asks quick questions, pick whatever matches the spec, simplest option, no forms, no auto summaries. No Start Building button? Switch to Build mode and send: \"Build the plan. Home dashboard first, then the six rooms, all empty with their freshness badges showing. No forms, no input fields, anywhere.\"",
      "While it builds: hit Publish top right, set visibility to private. If it seeded fake sample numbers, leave them, the room pastes below wipe them.",
    ],
  },
  {
    number: 3,
    title: "Money",
    before: ["Build mode from here through step 8. Fill your brackets, send, watch the room appear."],
    blocks: [
      {
        mode: "BUILD",
        text: `My Money room, all answers, then build it. My income per month: [[NUMBER]]. My fixed costs per month, what leaves no matter what: [[NUMBER]]. My total debt: [[NUMBER OR ZERO]]. Saved or liquid right now: [[NUMBER]]. The money number that would actually change something for me in the next 90 days: [[NUMBER]]. The one thing hitting it unlocks: [[ONE THING]].

Now build my Money room with exactly these numbers: income, fixed costs, debt, saved, and my 90 day target with a progress bar and what it unlocks next to it. Create this month's MoneySnapshot. Show the gap between income and fixed costs plainly. Put Updated today at the top, wired to the freshness badge. Replace any sample or placeholder data with only what I gave you. No forms. Ask me if anything is unclear.`,
      },
    ],
    after: ["Rough numbers beat no numbers. Ranges are fine. Nobody sees this app but you."],
  },
  {
    number: 4,
    title: "Health",
    blocks: [
      {
        mode: "BUILD",
        text: `My Health room, all answers, then build it. Days I actually trained in the last 7: [[NUMBER]]. Trained today: [[YES OR NO]]. My training target per week: [[DAYS]]. What counts as training for me: [[WHAT COUNTS]]. Hours of sleep I average: [[HOURS]]. When I actually go to bed most nights: [[TIME]]. The food rule I break most: [[THE RULE]]. What I will do instead this month: [[ONE SMALL SWAP]]. My energy today 1 to 10: [[NUMBER]]. The time of day my energy dies: [[TIME OF DAY]].

Now build my Health room: training days last week against my target, average sleep against eight hours, my food rule and its replacement, my energy line. Then create my first DailyLog for today from these answers and light up today on the 30 day streak grid on the home dashboard. Replace any sample data with only what I gave you. No forms.`,
      },
    ],
    after: ["When this one lands, today is lit on your grid. Day one, on the board."],
  },
  {
    number: 5,
    title: "Calendar",
    blocks: [
      {
        mode: "BUILD",
        text: `My Calendar room, all answers, then build it. Hours per week already committed and not mine to move, job, school, family: [[HOURS]]. Hours genuinely mine on a normal weekday: [[HOURS]]. When those free hours sit: [[MORNING, EVENING, OR LATE NIGHT]]. I am claiming a daily block for building my digital products business, the business where I sell digital products and use AI to build and run it faster, my block: [[START TO END]]. Days The Block runs: [[WHICH DAYS]]. My biggest time leak: [[THE LEAK]]. Honest hours that leak eats per week: [[HOURS]]. One weekly commitment that is non negotiable no matter what: [[MY COMMITMENT]].

Now build my Calendar room from these answers: committed hours, free hours and where they sit, The Block with its exact time, my leak and its weekly cost right beside The Block, and my protected commitment. Create the TimeBlocks. Make The Block the loudest thing in the room. Replace any sample data with only what I gave you. No forms.`,
      },
    ],
  },
  {
    number: 6,
    title: "Goals",
    before: ["One rule: every goal has a number or a date in it. If you cannot tell whether you missed it, it was a wish."],
    blocks: [
      {
        mode: "BUILD",
        text: `My Goals room, all answers, then build it. My 90 day goal, one line with a number in it: [[MY GOAL]]. My 1 year goal, measurable: [[MY GOAL]]. My 3 year goal, allowed to be big enough to be embarrassing: [[MY GOAL]]. The one that actually scares me: [[WHICH ONE]]. The real reason it scares me: [[REAL REASON]]. If I took the 90 day goal seriously, the thing I would do this week: [[THE ACTION]].

Now build my Goals room with my three horizons and their progress bars, starting at zero. Pin the 90 day goal to the top of the home dashboard where I see it before anything else, with this week's action under it in smaller text. Replace any sample data with only what I gave you. No forms.`,
      },
    ],
  },
  {
    number: 7,
    title: "Habits",
    before: ["Pick habits sized for bad days. The tired version of you is the one this room is for."],
    blocks: [
      {
        mode: "BUILD",
        text: `My Habits room, all answers, then build it. The one habit I am building this month: [[THE HABIT]]. Its smallest daily version, the one that survives a terrible day: [[TINY VERSION]]. Its trigger, I do it right after: [[MY ANCHOR]]. The habit I am killing this month: [[THE HABIT]]. When the urge hits I will do this instead: [[SMALL SPECIFIC MOVE]]. My streak target for the next 30 days, the real number not 30: [[NUMBER]].

Now build my Habits room: the habit I am building with its trigger, the habit I am killing with its replacement, and my 30 day streak target shown on the home streak grid as lit squares against target, like 1 of 22. Streak squares only ever light from my DailyLogs. Replace any sample data with only what I gave you. No forms.`,
      },
    ],
  },
  {
    number: 8,
    title: "Why",
    before: ["Shortest paste, heaviest room. Say it plainly. Nobody is grading it and nobody sees it but you."],
    blocks: [
      {
        mode: "BUILD",
        text: `My Why panel, all answers, then build it. The people this is actually for: [[THEIR NAMES]]. What changes for them when this works, concretely: [[WHAT CHANGES]]. The text I would send them the day it works, word for word: [[THE MESSAGE]]. If I quit this like I have quit things before, the honest cost: [[THE COST]]. When I go quiet for days, the line I want thrown at me, in my own words: [[THE LINE]].

Now build my Why panel on the home dashboard: who this is for, what changes for them, and the text I will send the day it works. Keep my quiet days line stored but not displayed, it is for my agent, not the wall. Place the panel under the streak grid. Replace any sample data with only what I gave you. No forms.`,
      },
    ],
  },
  {
    number: 9,
    title: "Final assembly, then your phone",
    blocks: [
      {
        mode: "BUILD",
        text: `Final assembly of my home dashboard, in this order top to bottom: Momentum Score, streak grid with current and best streak side by side, my 90 day goal with this week's action, freshness badges for all six rooms in one row, then my Why panel. Make it readable on a phone in ten seconds. Check every room one more time for forms or input fields and remove any you find. Then hunt down and delete every sample or placeholder record that did not come from me in this chat: fake logs, fake history months, fake streaks, and reset my best streak to zero until I actually earn it. My streak grid shows only days I actually logged, and my history starts today. Then confirm the app is published and private.`,
      },
    ],
    after: [
      "Open your published app on your phone. iPhone: Share, then Add to Home Screen. Android: Install from the menu. That icon is your scoreboard now.",
    ],
  },
  {
    number: 10,
    title: "The Superagent",
    before: [
      "Leave your app: click the upper left corner to exit the dashboard, then find the Superagents tab in the top left. Not the app builder. Everything in this step goes to the agent chat.",
      "Create it: pick Personal assistant, and skip the Google and Microsoft connect screens, top right. Then check its access: agent Settings, General, Cross-app data access. All workspace apps is the default and already covers your Creator OS. Leave it.",
      'Cannot find that setting? Ask the agent itself: "How do I give you access to my apps?" It knows its own current flow.',
    ],
    blocks: [
      {
        mode: "AGENT CHAT",
        text: `You are the voice of my Creator OS, the accountability side of the Creator OS app in this workspace. You have access to it through cross app data access.

Go read it now:
- My Goals room: my 90 day, 1 year and 3 year goals and this week's action
- My Habits room: the habit I am building, the one I am killing, my streak target
- My Health room: my training target and sleep target
- My Calendar room: The Block and when it runs
- My Why panel: who this is for, and my quiet days line. That line is for you, not for the wall.

That is your working knowledge. When we talk, pull from the app, not from memory.

How to talk to me: short, direct, zero fluff. Push back when I make excuses. Never be nicer than the truth.

Confirm by reading my 90 day goal and my why back to me from the app.`,
      },
      {
        mode: "AGENT CHAT",
        text: `Set up a workflow that messages me every morning at 7am. Ask me these five, one at a time, and wait for each answer:
1. Money I spent yesterday
2. Did I train yesterday
3. Hours I slept
4. One thing I shipped yesterday
5. My first block for today

When I have answered all five, create yesterday's DailyLog in my Creator OS app yourself, then tell me my current streak against my target, my best streak ever, and one straight line on whether I am on pace for my 90 day goal. If I skipped a day, say it straight and use my quiet days line from the Why room.

On Sundays, after the five, run my weekly reset with me: score my week from my DailyLogs against my targets, name the one number most off and ask me why, update my Goal progress as I answer, set next week's targets with me, and end with one small change for the week. Update the app as we go.

On the first Sunday of each month, also walk me through updating my MoneySnapshot: income, fixed costs, debt, saved.`,
      },
      {
        mode: "AGENT CHAT",
        text: `Also set up two more things, so this keeps pulling me back every day, not just at 7am.

First, a lighter check at 8pm the same day, but only if I have not answered that morning's five questions or logged anything today: send me one text, "Did you get anything in today? Reply with what you shipped or just say no." If I answer, log it as today's DailyLog right then, don't wait for tomorrow morning. If I don't reply by the next morning's message, mark today as missed honestly when you report my streak, don't hide it from me.

Second, any time my streak passes my previous best, or hits 7, 30, 60, or 90 days, text me immediately, separate from the morning or evening messages, congratulating me and naming the number. This is the only automatic message you ever send outside the scheduled check ins.`,
      },
    ],
    after: ["7 AM is the default, not the law. If you wake at 6 or 9, say that instead."],
  },
  {
    number: 11,
    title: "Connect your texts, then test",
    before: [
      "Only now, after the schedule exists. Connect the channel first and it texts you its own random questions. Schedule, then channel. Every time.",
      "In the agent's left sidebar: Continue on iMessage (iPhone) or WhatsApp (Android). Scan your QR, about a minute. Then send this as a text from your phone:",
    ],
    blocks: [
      {
        mode: "FROM YOUR PHONE",
        text: `Test run. Ask me the five morning questions now, one at a time. Write the log, light the grid, and show me the streak.`,
      },
    ],
    after: [
      "Your phone asks, you answer in texts, the app updates itself and the grid moves. That loop is the entire system. Tomorrow at 7 AM it starts without you, and tonight at 8 it checks on you if you went quiet.",
    ],
  },
];

const TROUBLESHOOTING = [
  { problem: "Confusing questions back", fix: "You pasted a fragment. Recopy the whole block, send again." },
  { problem: "Plan card appears", fix: "Good. View, then Start Building. Never Skip plan." },
  { problem: "Wild planning questions", fix: "Pick whatever matches the spec. Simplest option. No forms, no auto summaries." },
  { problem: "Fake numbers in a room", fix: "The room pastes and final assembly wipe them. Keep going." },
  { problem: "It offers forms or edit buttons", fix: "Say no. You update it by chat. That is the whole system." },
  { problem: "Agent cannot see your app", fix: 'Ask it: "How do I give you access to my apps?" Then check Cross-app data access in its settings.' },
  { problem: "Agent web chat hangs", fix: "Test from your phone texts instead. The text channel works." },
];

export default function CreatorOsSteps() {
  return (
    <section className="pb-16">
      <Container className="flex flex-col gap-10">
        {STEPS.map((step) => (
          <Card key={step.number} className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {step.number}
              </span>
              <h2 className="text-lg font-extrabold">{step.title}</h2>
            </div>

            {step.before?.map((p, i) => (
              <p key={i} className="text-sm text-muted">
                {p}
              </p>
            ))}

            {step.blocks?.map((block, i) => (
              <CopyBlock key={i} label={block.mode} text={block.text} />
            ))}

            {step.after?.map((p, i) => (
              <p key={i} className="text-sm text-muted">
                {p}
              </p>
            ))}
          </Card>
        ))}

        <Card className="flex flex-col gap-4 text-left">
          <h2 className="text-lg font-extrabold">If you get stuck</h2>
          <div className="flex flex-col gap-3">
            {TROUBLESHOOTING.map((row) => (
              <div
                key={row.problem}
                className="rounded-xl border border-border bg-background p-4"
              >
                <p className="text-sm font-bold text-foreground">{row.problem}</p>
                <p className="mt-1 text-sm text-muted">{row.fix}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="text-center">
          <p className="text-sm text-muted">
            This is step one of the 3-Day Workshop. The rest of Creator
            Blueprint unlocks after it.
          </p>
          <p className="mt-3 text-sm font-bold text-accent">
            Tomorrow morning it texts you first. Answer it. That is the whole
            job now.
          </p>
        </Card>
      </Container>
    </section>
  );
}
