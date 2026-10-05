import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";

const STEPS = [
  {
    number: "1",
    title: "Answer The Call",
    body: "Keep your phone nearby. One of our coaches is calling you within the next 5 minutes.",
  },
  {
    number: "2",
    title: "Get Set Up Live",
    body: "Your coach walks you through getting access right there on the call.",
  },
  {
    number: "3",
    title: "Get Instant Access",
    body: "You're in the full course and community the moment the call ends.",
  },
];

export default function FreeCourseConfirmationNextSteps() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading eyebrow="What Happens Next" title="3 Quick Steps" />

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
      </Container>
    </section>
  );
}
