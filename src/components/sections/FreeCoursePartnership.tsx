import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import CtaButton from "@/components/ui/CtaButton";

export default function FreeCoursePartnership() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <SectionHeading
          eyebrow="Why This Is Free"
          title="I Partnered With Base44 So You Don't Have To Pay For This"
          subtitle="Base44 is covering the cost of giving this course away — here's exactly why, straight from the source."
        />

        <EmbedPlaceholder label="Partnership explainer video — swap in a real WistiaEmbed mediaId here" />

        <CtaButton
          label="GET FREE ACCESS"
          subtext="Claim your spot before this offer closes."
          href="#access"
        />
      </Container>
    </section>
  );
}
