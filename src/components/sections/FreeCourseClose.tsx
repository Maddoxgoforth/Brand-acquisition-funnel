import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

const CHECKLIST = [
  "The complete system",
  "3-day build workshop",
  "1-on-1 onboarding call",
  "No card required to apply",
];

export default function FreeCourseClose() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <Pill>Get Started</Pill>

        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Claim Your Free Course
        </h2>
        <p className="max-w-md text-muted">
          Apply in 2 minutes and a coach reaches out to get you set up.
        </p>

        <Card className="w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-black tracking-[0.2em]">MADDOX</p>

            <div>
              <p className="text-lg font-extrabold text-danger line-through">
                $4,000 course
              </p>
              <p className="text-4xl font-black text-accent">FREE</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Today you pay nothing
              </p>
            </div>

            <ul className="flex flex-col gap-2 self-start text-left">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-accent">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <FreeCourseCta label="Claim Your Free Course" />

            <p className="text-sm text-muted">
              This won&apos;t be free forever. Grab it while it&apos;s free.
            </p>

            <p className="text-[11px] leading-snug text-muted/80">
              18+ only. Educational training that teaches a skill, not a
              business opportunity or income guarantee. Partnership
              disclosure: Base44 compensates Maddox for this partnership,
              which is what keeps this free for you.
            </p>
          </div>
        </Card>
      </Container>
    </section>
  );
}
