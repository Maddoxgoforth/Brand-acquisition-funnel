import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import CtaButton from "@/components/ui/CtaButton";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

export default function FreeCourseHero() {
  return (
    <section className="pt-6 pb-16">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-black tracking-[0.3em]">MADDOX</p>

        <Pill>In Partnership With Base44</Pill>

        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          My Course Is Free Thanks To{" "}
          <span className="text-accent">Base44</span>
        </h1>

        <EmbedPlaceholder
          label="VSL (vertical) — swap in a real WistiaEmbed mediaId here"
          aspect="vertical"
        />

        <CtaButton
          label="GET FREE ACCESS"
          subtext="No card required. Just claim your spot."
          href="#access"
        />

        <div id="access" className="w-full">
          <EmbedPlaceholder
            label="Opt-in embed goes here (Typeform / email capture)"
            aspect="square"
          />
        </div>
      </Container>
    </section>
  );
}
