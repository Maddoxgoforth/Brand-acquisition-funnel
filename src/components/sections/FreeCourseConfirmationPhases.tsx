import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";

const PHASES = [
  {
    number: "1",
    title: "Introduction",
    body: "Get oriented in the system and exactly what you're about to build.",
  },
  {
    number: "2",
    title: "Mindset",
    body: "Break the comparison loop and become the person who actually posts.",
  },
  {
    number: "3",
    title: "Set Up Your AI Tools",
    body: "Get every AI tool you need installed and configured correctly.",
  },
  {
    number: "4",
    title: "Create Your First Videos",
    body: "Go from zero to your first pieces of content, start to finish.",
  },
  {
    number: "5",
    title: "Learn How To Create Good Content",
    body: "Hooks, pacing, and the patterns that actually stop the scroll.",
  },
  {
    number: "6",
    title: "Create Your Digital Product",
    body: "Build the AI digital product you'll actually sell to your audience.",
  },
  {
    number: "7",
    title: "Sell To Your Audience And Scale",
    body: "Turn your content and product into consistent sales, then scale it up.",
  },
];

export default function FreeCourseConfirmationPhases() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="The Full Program"
          title="7 Phases, Start To Finish"
        />

        <div className="grid w-full grid-cols-1 gap-4">
          {PHASES.map((phase) => (
            <Card key={phase.number} className="text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white">
                  {phase.number}
                </span>
                <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                  Included
                </span>
              </div>
              <p className="mt-3 text-base font-extrabold">
                Phase {phase.number}: {phase.title}
              </p>
              <p className="mt-1 text-sm text-muted">{phase.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
