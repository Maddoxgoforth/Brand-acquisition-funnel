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
    <section className="pt-16 pb-4">
      <Container className="flex flex-col items-center gap-4">
        <Card className="w-full text-left">
          <p className="mb-2 text-center text-lg font-black tracking-[0.2em]">
            CREATOR BLUEPRINT
          </p>
          <div className="my-4 h-px w-full bg-border" />
          <ul className="flex flex-col gap-5">
            {INCLUDES.map((item) => (
              <li key={item} className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-foreground">
                  {item}
                </span>
                <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                  Included
                </span>
              </li>
            ))}
          </ul>
          <div className="my-6 h-px w-full bg-border" />
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted">
                Part Of My $4,000 Course
              </span>
              <span className="shrink-0 text-lg font-extrabold text-danger line-through">
                $4,000
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted">
                Your Price Today
              </span>
              <span className="shrink-0 text-lg font-black text-green-600">
                FREE
              </span>
            </div>
          </div>
        </Card>
        <p className="text-center text-sm font-bold italic text-orange-600">
          This won&apos;t be free forever. Grab it while it&apos;s free.
        </p>
      </Container>
    </section>
  );
}
