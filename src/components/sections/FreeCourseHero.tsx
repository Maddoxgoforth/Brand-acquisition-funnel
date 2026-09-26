import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import CtaButton from "@/components/ui/CtaButton";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

export default function FreeCourseHero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>

        <Pill>In Partnership With Base44</Pill>

        <p className="text-sm font-extrabold uppercase tracking-widest text-accent">
          ▶ Watch This Video Now
        </p>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          I Partnered With A{" "}
          <span className="text-accent">Billion-Dollar Company</span> To Give
          Away My Entire Course For <span className="text-accent">Free</span>
        </h1>

        <p className="max-w-md text-lg text-muted">
          The exact system I used to build a 400K+ following and sell six
          figures in digital products using AI — normally behind a paywall,
          free right now because Base44 is covering the cost.
        </p>

        <EmbedPlaceholder label="VSL — swap in a real WistiaEmbed mediaId here" />

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
