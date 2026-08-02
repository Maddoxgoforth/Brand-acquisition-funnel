import Container from "@/components/ui/Container";
import CtaButton from "@/components/ui/CtaButton";

const WITH_MADDOX = [
  "PICK ONE THING AND COMMIT UNTIL IT WORKS",
  "1-ON-1 COACHING + A 90-DAY ROADMAP BUILT FOR YOU",
  "CUSTOM AI TOOLS, TEMPLATES & SCRIPTS (NO GUESSWORK)",
  "BUILD A REAL PRODUCT PEOPLE ACTUALLY PAY FOR",
  "YOU DO THE WORK. I GUIDE YOU. YOU GET PAID.",
];

const WITHOUT_MADDOX = [
  "JUMP TO A NEW BUSINESS MODEL EVERY FEW WEEKS",
  "STAY A CONSUMER, BUY COURSES, NEVER BUILD",
  "FOLLOW RANDOM GURUS WITH NO REAL PLAN",
  "WAIT TO \"FEEL READY\" TO PUT THEIR FACE OUT THERE",
  "QUIT THE MOMENT IT STOPS BEING EASY",
];

export default function Comparison() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            ⚠️ WHY MOST PEOPLE YOUR AGE STAY STUCK
          </h2>
          <p className="text-muted">And Why Ours Break Through Fast</p>
        </div>

        <div className="w-full rounded-2xl bg-accent p-6">
          <p className="mb-4 flex items-center gap-3 text-lg font-extrabold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-accent">
              ✓
            </span>
            WITH MADDOX:
          </p>
          <ul className="flex flex-col gap-3">
            {WITH_MADDOX.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-zinc-900"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6">
          <p className="mb-4 flex items-center gap-3 text-lg font-extrabold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger text-white">
              ✕
            </span>
            MOST PEOPLE YOUR AGE:
          </p>
          <ul className="flex flex-col gap-3">
            {WITHOUT_MADDOX.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-zinc-900"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-xs text-white">
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <CtaButton />
      </Container>
    </section>
  );
}
