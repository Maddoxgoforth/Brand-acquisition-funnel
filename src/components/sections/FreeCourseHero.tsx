import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import WistiaEmbed from "@/components/ui/WistiaEmbed";
import FreeCourseCta from "@/components/ui/FreeCourseCta";
import SocialIconBackground from "@/components/ui/SocialIconBackground";

export default function FreeCourseHero() {
  return (
    <section className="relative overflow-hidden bg-background-elevated pt-6 pb-16">
      <SocialIconBackground />
      <Container className="relative flex flex-col items-center gap-4 text-center">
        <Pill>CREATOR BLUEPRINT · FREE ACCESS</Pill>

        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          This Used To Be Part Of My{" "}
          <span className="text-accent">$4,000</span> Course. Now You Can
          Learn It For Free.
        </h1>

        <p className="max-w-md text-muted">
          Watch the video below to get the step-by-step to start learning.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-bold text-accent">
            ✓ No experience needed
          </span>
          <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-bold text-accent">
            ✓ No audience needed
          </span>
        </div>

        <div className="mx-auto w-3/4">
          <WistiaEmbed mediaId="mmgcz1a9lr" aspect={0.5625} />
        </div>

        <FreeCourseCta />
      </Container>
    </section>
  );
}
