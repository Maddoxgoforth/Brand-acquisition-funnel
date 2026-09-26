import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

const STEPS = [
  {
    number: "1",
    title: "Fill Out The Short Form",
    body: "2 minutes. No experience, no audience needed.",
  },
  {
    number: "2",
    title: "A Coach Onboards You",
    body: "We plug you into the system and the 3-day workshop.",
  },
  {
    number: "3",
    title: "Post Your First Piece Of Content",
    body: "You walk out with the system running and a clear plan to launch your first AI digital product.",
  },
];

export default function FreeCourseSteps() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="3 Simple Steps"
          title="Get Your Free Access in 3 Steps"
        />

        <div className="grid w-full grid-cols-1 gap-4">
          {STEPS.map((step) => (
            <Card key={step.number} className="text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white">
                {step.number}
              </span>
              <p className="mt-3 text-base font-extrabold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </Card>
          ))}
        </div>

        <FreeCourseCta
          label="GET YOUR FREE SYSTEM"
          subtext="No card required. Just claim your spot."
        />
      </Container>
    </section>
  );
}
