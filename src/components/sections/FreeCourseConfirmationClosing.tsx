import Container from "@/components/ui/Container";

export default function FreeCourseConfirmationClosing() {
  return (
    <section className="pt-4 pb-16">
      <Container className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-extrabold">That&apos;s it.</p>
        <p className="max-w-md text-muted">
          Now keep your phone close. Your coach will call you to set you up
          while you wait.
        </p>
      </Container>
    </section>
  );
}
