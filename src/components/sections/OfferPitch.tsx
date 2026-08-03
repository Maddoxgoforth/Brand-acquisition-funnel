import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaButton from "@/components/ui/CtaButton";

const INCLUDES = [
  "Weekly training on building a personal brand and selling digital products",
  "Proven frameworks, scripts, and templates you can copy directly",
  "Direct access to get feedback on your content and your product",
  "New lessons, tools, and resources added every month",
];

export default function OfferPitch() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="The Offer"
          title="Everything Inside The Membership"
          subtitle="One monthly payment. Cancel whenever you want."
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
          label="GET INSTANT ACCESS — $50/MO"
          subtext="Cancel anytime. Start today."
          href="#"
        />
      </Container>
    </section>
  );
}
