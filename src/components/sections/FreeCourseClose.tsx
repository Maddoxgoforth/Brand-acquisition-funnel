import Container from "@/components/ui/Container";
import CtaButton from "@/components/ui/CtaButton";

export default function FreeCourseClose() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          This Won&apos;t Stay <span className="text-accent">Free</span>{" "}
          Forever
        </h2>
        <p className="max-w-md text-lg text-muted">
          Base44 is covering the cost of this course for a limited time.
          Claim your spot while it&apos;s still free.
        </p>
        <CtaButton
          label="CLAIM MY FREE SPOT"
          subtext="Don't overthink it. Just start."
          href="#access"
        />
      </Container>
    </section>
  );
}
