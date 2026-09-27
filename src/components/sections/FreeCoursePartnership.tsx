import Container from "@/components/ui/Container";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

export default function FreeCoursePartnership() {
  return (
    <section className="pt-4 pb-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <FreeCourseCta label="Get Your Free System" />

        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">
            No Catch
          </p>
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            How Is This Free?
          </h2>
        </div>

        <p className="max-w-md text-muted">
          I&apos;ve made over $200,000 selling this exact system myself. So
          you might be asking, &ldquo;how are you giving this away for
          free?&rdquo;
        </p>

        <p className="max-w-md text-muted">
          There is none. I partnered with a billion-dollar AI company, and
          they pay me for giving you access to this. All you need is the
          single AI tool I use in my business every day. It&apos;s a
          win-win for everyone.
        </p>
      </Container>
    </section>
  );
}
