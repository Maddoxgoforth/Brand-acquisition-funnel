import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";
import TypeformEmbed from "@/components/ui/TypeformEmbed";

export default function Hero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>

        <Pill>No Audience. No Experience Needed.</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Learn exactly how I went from a broke student to{" "}
          <span className="text-accent">$20k/mo</span> selling AI Digital
          Products
        </h1>

        <p className="max-w-md text-lg text-muted">
          The exact 90-day system I used to make real money selling my own AI
          digital product before I turned 18. No audience, no experience, no
          guessing.
        </p>

        <EmbedPlaceholder label="VSL EMBED" className="min-h-[320px]" />

        <TypeformEmbed id="zKqvPAGW" />
      </Container>
    </section>
  );
}
