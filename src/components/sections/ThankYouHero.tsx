import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";

export default function ThankYouHero() {
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <p className="text-xl font-black tracking-[0.3em]">MADDOX</p>

        <Pill>You&apos;re Booked</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          You&apos;re In. <span className="text-accent">Call Confirmed.</span>
        </h1>

        <p className="max-w-md text-lg text-muted">
          Check your email for the calendar invite. Before we talk, watch the
          breakdowns below — they cover the questions most people ask me
          before joining.
        </p>
      </Container>
    </section>
  );
}
