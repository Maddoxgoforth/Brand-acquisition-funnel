import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";

const INCLUDES = [
  "The Complete Personal Brand Starter System",
  "3-Day Content Build Workshop (step-by-step setup)",
  "Content & Hook Writing Module",
  "AI Integration Module (automate the busywork)",
  "Anti-Comparison Mindset Module",
  "Offer Creation System (scripts + templates)",
  "AI Content Assistant (script on autopilot)",
  "AI Funnel Builder",
  "AI Product Builder",
  "1-on-1 Onboarding Call With A Coach",
];

export default function FreeCoursePitch() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8">
        <Card className="w-full text-left">
          <p className="mb-2 text-center text-lg font-black tracking-[0.2em]">
            MADDOX
          </p>
          <div className="my-4 h-px w-full bg-border" />
          <ul className="flex flex-col gap-4">
            {INCLUDES.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <span className="text-sm font-bold text-foreground">
                  {item}
                </span>
                <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                  Included
                </span>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px w-full bg-border" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-widest text-muted">
              Part Of My $4,000 Course
            </p>
            <p className="text-lg font-extrabold text-danger line-through">
              $4,000
            </p>
          </div>
        </Card>
      </Container>
    </section>
  );
}
