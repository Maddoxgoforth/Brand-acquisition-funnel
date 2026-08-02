import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import TypeformEmbed from "@/components/ui/TypeformEmbed";
import WistiaEmbed from "@/components/ui/WistiaEmbed";

export default function Hero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>

        <Pill>No Audience. No Experience Needed.</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Learn exactly how I went from a broke student and made{" "}
          <span className="text-accent">$200k</span> selling AI Digital
          Products
        </h1>

        <p className="max-w-md text-lg text-muted">
          The exact 90-day system I used to make real money selling my own AI
          digital product before I turned 18. No audience, no experience, no
          guessing.
        </p>

        <WistiaEmbed mediaId="p3h2xpk8hb" />

        <TypeformEmbed id="zKqvPAGW" />
      </Container>
    </section>
  );
}
