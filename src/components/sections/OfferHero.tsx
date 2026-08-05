import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import WhopCheckoutEmbed from "@/components/ui/WhopCheckoutEmbed";

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
          System That Made Me <span className="text-accent">$200K</span>
        </h1>

        <p className="max-w-md text-lg text-muted">
          I&apos;ve built a 400K+ following and sold six figures in digital
          products using AI. This is the exact playbook I use, broken down
          into a monthly membership so you can start today.
        </p>

        <EmbedPlaceholder label="VSL — COMING SOON" />

        <p className="text-2xl font-extrabold text-accent">$50/Month</p>

        <WhopCheckoutEmbed planId="plan_LYj5o1sOR9YRW" />
      </Container>
    </section>
  );
}
