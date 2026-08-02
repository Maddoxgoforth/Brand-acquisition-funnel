import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import CtaButton from "@/components/ui/CtaButton";

const FEATURES = [
  {
    icon: "◎",
    title: "DONE-FOR-YOU SYSTEMS",
    body: "Custom AI tools, a Hook Generator, templates and a full resource library. You just plug in and build.",
  },
  {
    icon: "💬",
    title: "1-ON-1 MENTORSHIP",
    body: "Weekly one-on-one calls with me, direct chat access, and a 90-day roadmap built around your niche.",
  },
  {
    icon: "💰",
    title: "REAL RESULTS",
    body: "The goal is your first $10K from your own digital product in about 90 days, if you do the work.",
  },
];

export default function Blueprint() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <div className="w-full border-t-4 border-accent" />

        <h2 className="text-center text-3xl font-extrabold leading-tight sm:text-4xl">
          THIS{" "}
          <span className="text-accent line-through decoration-4">
            ISN&apos;T A COURSE.
          </span>{" "}
          IT&apos;S A BLUEPRINT TO YOUR FIRST{" "}
          <span className="text-accent">$10K</span> SELLING{" "}
          <span className="text-accent">AI DIGITAL PRODUCTS</span>
        </h2>

        <p className="text-center text-lg text-muted">
          You&apos;re Not Here To &ldquo;Learn.&rdquo; You&apos;re Here To
          Build And Sell.
        </p>

        <div className="flex w-full flex-col gap-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-4"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-white">
                {feature.icon}
              </span>
              <Card className="w-full text-center">
                <h3 className="text-xl font-extrabold">{feature.title}</h3>
                <p className="mt-3 text-muted">{feature.body}</p>
              </Card>
            </div>
          ))}
        </div>

        <CtaButton />
      </Container>
    </section>
  );
}
