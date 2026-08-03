import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import EmbedPlaceholder from "@/components/ui/EmbedPlaceholder";

const QUESTIONS = [
  "HOW FAST CAN I SEE RESULTS?",
  "HOW MUCH DOES THIS COST?",
  "WHAT DO I NEED TO KNOW ABOUT AI?",
  "WHAT IF I'M BUSY?",
  "DO I NEED AN AUDIENCE ALREADY?",
];

export default function ObjectionVideosMid() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title="BEFORE YOUR CALL"
          subtitle="A few quick answers to the questions people usually have before they join."
        />

        <div className="flex w-full flex-col gap-6">
          {QUESTIONS.map((question) => (
            <Card key={question} className="w-full">
              <p className="mb-4 text-lg font-extrabold">{question}</p>
              <EmbedPlaceholder label="VIDEO COMING SOON" />
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
