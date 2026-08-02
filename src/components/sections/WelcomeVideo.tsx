import Container from "@/components/ui/Container";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

export default function WelcomeVideo() {
  return (
    <section className="pb-16">
      <Container>
        <EmbedPlaceholder label="WELCOME VIDEO" className="min-h-[320px]" />
      </Container>
    </section>
  );
}
