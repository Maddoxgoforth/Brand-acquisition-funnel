import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import CtaButton from "@/components/ui/CtaButton";

export default function OfferHero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>

        <Pill>You Qualify For This</Pill>

        <p className="text-sm font-extrabold uppercase tracking-widest text-accent">
          ▶ Watch This Video Now
        </p>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          The <span className="text-accent">$50/Month</span>{" "}
          System To Build Your Personal Brand &amp; Sell Digital Products
        </h1>

        <p className="max-w-md text-lg text-muted">
          I&apos;ve built a 290K+ following and sold six figures in AI digital
          products. This is the exact playbook I use, broken down into a
          monthly membership so you can start today.
        </p>

        <EmbedPlaceholder label="VSL — COMING SOON" />

        <CtaButton
          label="GET INSTANT ACCESS — $50/MO"
          subtext="Cancel anytime. Start today."
          href="#"
        />
      </Container>
    </section>
  );
}
