import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import WhySkillIcon, { type WhySkillIconName } from "@/components/ui/WhySkillIcon";

const REASONS: {
  icon: WhySkillIconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "package",
    title: "No Inventory To Manage",
    body: "You're not shipping anything. You package what you know once and sell it forever.",
  },
  {
    icon: "phone",
    title: "Work From Anywhere",
    body: "A phone and wifi. That's the whole setup.",
  },
  {
    icon: "bot",
    title: "AI Helps You",
    body: "AI helps you script content and build your systems faster so you move quicker.",
  },
  {
    icon: "dollar",
    title: "Low Cost To Start",
    body: "No inventory, no ad spend to start. You start with what you already know.",
  },
  {
    icon: "repeat",
    title: "Recurring Demand",
    body: "People will always want to learn how to get results faster. That demand doesn't go away.",
  },
  {
    icon: "trending",
    title: "Room To Grow",
    body: "Most people still don't know how to build a real personal brand. There's plenty of room.",
  },
];

export default function FreeCourseWhySkill() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="The Skill"
          title="Why This Skill Is Worth Learning:"
          subtitle="You don't build a physical product. You learn to build and sell AI digital products, real products people actually pay for."
        />

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {REASONS.map((reason, i) => (
            <Card key={reason.title} className="text-left">
              <div className="flex items-center justify-between">
                <WhySkillIcon name={reason.icon} />
                <span className="text-sm font-bold text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-3 text-base font-extrabold">{reason.title}</p>
              <p className="mt-1 text-sm text-muted">{reason.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
