import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import TypeformEmbed from "@/components/ui/TypeformEmbed";
import WistiaEmbed from "@/components/ui/WistiaEmbed";

export default function Hero() {
  return (
    <section className="pt-6 pb-16">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-black tracking-[0.3em]">MADDOX</p>

        <Pill>No Audience. No Experience Needed.</Pill>

        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          How I made <span className="text-accent">$200k</span> selling
          digital products using AI
        </h1>

        <WistiaEmbed mediaId="p3h2xpk8hb" />

        <TypeformEmbed id="zKqvPAGW" />
      </Container>
    </section>
  );
}
