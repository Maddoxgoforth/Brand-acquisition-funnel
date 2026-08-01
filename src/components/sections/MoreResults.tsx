import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

const RESULTS = [
  "CLIENT RESULT 1",
  "CLIENT RESULT 2",
  "CLIENT RESULT 3",
  "CLIENT RESULT 4",
];

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

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {RESULTS.map((label) => (
            <Card key={label} className="w-full">
              <EmbedPlaceholder label={label} className="min-h-[180px]" />
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
