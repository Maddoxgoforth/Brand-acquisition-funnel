import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";

const TOOLS = [
  "Hook Generator",
  "Offer Pricing Calculator",
  "AI Content Assistant",
  "AI Funnel Builder",
  "AI Product Builder",
];

export default function FreeCourseTools() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          All The Built-In Tools
        </h2>

        <Card className="w-full text-left">
          <ul className="flex flex-col gap-4">
            {TOOLS.map((tool) => (
              <li
                key={tool}
                className="border-b border-border pb-4 text-lg font-extrabold last:border-b-0 last:pb-0"
              >
                {tool}
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </section>
  );
}
