import Container from "@/components/ui/Container";
import CtaButton from "@/components/ui/CtaButton";

export default function OfferClose() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Your Next $50 Can Buy A{" "}
          <span className="text-accent">Netflix Subscription</span>, Or It
          Can Buy The System That Made Me{" "}
          <span className="text-accent">$200K</span>
        </h2>
        <p className="max-w-md text-lg text-muted">
          You already qualified for this. The only thing left is deciding to
          start.
        </p>
        <CtaButton
          label="CHOOSE THE SYSTEM — $50/MO"
          subtext="Don't overthink it. Just start."
          href="#"
        />
      </Container>
    </section>
  );
}
