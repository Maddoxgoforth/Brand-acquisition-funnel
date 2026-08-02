import Container from "@/components/ui/Container";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "X", "Threads"];

export default function SocialProof() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <p className="text-lg text-muted">
          An audience of <span className="font-bold text-foreground">300K+</span>{" "}
          built from a bedroom, across
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {PLATFORMS.map((platform) => (
            <span
              key={platform}
              className="text-lg font-extrabold uppercase tracking-wide text-muted/50"
            >
              {platform}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
