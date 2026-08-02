import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

const DEREK_VIEWS = ["3,322 VIEWS", "4,542 VIEWS", "157K VIEWS", "1.8M VIEWS"];

export default function MoreResults() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title={
            <>
              MORE <span className="text-accent">CLIENT RESULTS</span>
            </>
          }
          subtitle="More proof from people running the same system, while you wait for your call."
        />

        <Card className="w-full">
          <p className="text-3xl font-extrabold text-accent">$39,549</p>
          <p className="mt-1 text-sm text-muted">
            JJ — JJVending total sales, 116.46K sessions, 1.94% conversion
            rate
          </p>
          <div className="mt-5">
            <EmbedPlaceholder
              label="JJVENDING DASHBOARD"
              className="min-h-[220px]"
            />
          </div>
        </Card>

        <Card className="w-full">
          <p className="text-3xl font-extrabold text-accent">
            3K → 1.8M views
          </p>
          <p className="mt-1 text-sm text-muted">
            Derek — taken from getting low views to high views
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {DEREK_VIEWS.map((label) => (
              <EmbedPlaceholder
                key={label}
                label={label}
                className="min-h-[160px]"
              />
            ))}
          </div>
        </Card>
      </Container>
    </section>
  );
}
