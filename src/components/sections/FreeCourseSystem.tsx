import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

const STEPS = [
  {
    icon: "🎯",
    title: "Build Your Audience",
    body: "Post content that attracts the exact people who'd want to learn from you.",
  },
  {
    icon: "📦",
    title: "Package Your Knowledge",
    body: "Turn what you already know into a real AI digital product people can buy.",
  },
  {
    icon: "🚀",
    title: "Sell It With Content",
    body: "The exact scripts and hooks that turn viewers into buyers.",
  },
];

export default function FreeCourseSystem() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="What You Get"
          title="A Complete AI Digital Products System"
          subtitle="No guesswork. You get the full system, ready to use."
        />

        <div className="grid w-full grid-cols-1 gap-4">
          {STEPS.map((step) => (
            <Card key={step.title} className="text-left">
              <span className="text-2xl" aria-hidden>
                {step.icon}
              </span>
              <p className="mt-3 text-base font-extrabold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </Card>
          ))}
        </div>

        <FreeCourseCta
          label="START BUILDING FREE"
          subtext="No card required. Just claim your spot."
        />
      </Container>
    </section>
  );
}
