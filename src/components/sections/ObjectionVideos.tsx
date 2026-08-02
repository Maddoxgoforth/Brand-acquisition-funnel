import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import WistiaEmbed from "@/components/ui/WistiaEmbed";

const QUESTIONS = [
  { question: "HOW FAST CAN I SEE RESULTS?", mediaId: "dtzh09vaul" },
  { question: "HOW MUCH DOES THIS COST?", mediaId: "66hfb05ixg" },
  { question: "WHAT DO I NEED TO KNOW ABOUT AI?", mediaId: "i2adhy6vaa" },
  { question: "WHAT IF I'M BUSY?", mediaId: "cx7vo9e5ql" },
  { question: "DO I NEED AN AUDIENCE ALREADY?", mediaId: "v2purp6i2r" },
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
          {QUESTIONS.map(({ question, mediaId }) => (
            <Card key={mediaId} className="w-full">
              <p className="mb-4 text-lg font-extrabold">{question}</p>
              <WistiaEmbed mediaId={mediaId} />
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
