import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

export default function FreeCourseConfirmationHero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-4 text-center">
        <Pill>YOU&apos;RE IN</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          We&apos;ll Call You Within The Next 5 Minutes
        </h1>

        <p className="max-w-md text-muted">
          Keep your phone nearby. One of our team members is calling you
          shortly to get you set up.
        </p>

        <p className="text-lg font-bold text-accent">
          Watch This Video To Confirm Your Spot
        </p>

        <EmbedPlaceholder
          label="Confirmation VSL (vertical): swap in a real WistiaEmbed mediaId here"
          aspect="vertical"
        />
      </Container>
    </section>
  );
}
