import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaButton from "@/components/ui/CtaButton";

const INCLUDES = [
  "The exact framework for building a personal brand from zero followers",
  "How to identify your ICP and create content that actually converts",
  "A step-by-step breakdown of how I built and sold my first digital product",
  "How I use AI as leverage across content, offers, and funnels — not as the product itself",
  "The funnel structure that turns viewers into buyers, broken down piece by piece",
];

export default function FreeCoursePitch() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="What's Inside"
          title="Everything In The Free Course"
          subtitle="The full system. Zero cost. Courtesy of Base44."
        />

        <Card className="w-full text-left">
          <ul className="flex flex-col gap-4">
            {INCLUDES.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-muted">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <CtaButton
          label="CLAIM YOUR FREE SPOT"
          subtext="Everything above, unlocked today."
          href="#access"
        />
      </Container>
    </section>
  );
}
