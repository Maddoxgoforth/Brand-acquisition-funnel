import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import WistiaEmbed from "@/components/ui/WistiaEmbed";

const QUESTIONS = [
  { question: "DO I NEED AN AUDIENCE ALREADY?", mediaId: "dw5ztrjjn2" },
  { question: "DO I NEED TO BE GOOD WITH TECH OR AI?", mediaId: "q31mbgjy09" },
  {
    question: "I'M BUSY WITH SCHOOL OR WORK. DO I HAVE TIME FOR THIS?",
    mediaId: "3pzb63tfl6",
  },
  { question: "WHAT IF I DON'T KNOW WHAT TO SELL?", mediaId: "oiwgvas4m0" },
  {
    question: "HOW MUCH DOES IT COST, AND HOW DOES IT WORK?",
    mediaId: "4fahz7a1qq",
  },
  { question: "HOW FAST CAN I SEE RESULTS?", mediaId: "obrkbsk60s" },
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
