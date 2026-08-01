import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

const VIDEOS = [
  "BREAKDOWN VIDEO 1",
  "BREAKDOWN VIDEO 2",
  "BREAKDOWN VIDEO 3",
];

export default function ObjectionVideos() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title="BEFORE YOUR CALL"
          subtitle="A few quick breakdowns answering the questions people usually have before they join."
        />

        <div className="flex w-full flex-col gap-6">
          {VIDEOS.map((label) => (
            <EmbedPlaceholder key={label} label={label} className="min-h-[220px]" />
          ))}
        </div>
      </Container>
    </section>
  );
}
