import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

const QUESTIONS = [
  "Question 1",
  "Question 2",
  "Question 3",
  "Question 4",
  "Question 5",
];

export default function ObjectionVideos() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title="BEFORE YOUR CALL"
          subtitle="A few quick answers to the questions people usually have before they join."
        />

        <div className="flex w-full flex-col gap-6">
          {QUESTIONS.map((question, index) => (
            <Card key={question} className="w-full">
              <p className="mb-4 text-lg font-extrabold">{question}</p>
              <EmbedPlaceholder
                label={`BREAKDOWN VIDEO ${index + 1}`}
                className="min-h-[220px]"
              />
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
