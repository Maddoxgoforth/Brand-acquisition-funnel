import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";

const STATS = [
  { value: "11", label: "PASTES" },
  { value: "~60", label: "MIN" },
  { value: "0", label: "CODE" },
];

export default function CreatorOsIntro() {
  return (
    <section className="pt-12 pb-10">
      <Container className="flex flex-col items-center gap-5 text-center">
        <Pill>CREATOR BLUEPRINT · BONUS BUILD</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Creator OS, <span className="text-accent">the Workshop Edition</span>
        </h1>

        <p className="max-w-md text-muted">
          The dashboard that runs your money, your health, your time, your
          goals, your habits, and your why, plus the agent that texts you
          morning and night and updates it when you text back. Built for the
          business of selling digital products with AI, but it runs your
          whole life, not just your content. Same build as the course.
          Compressed, so you can do it live in one sitting. Replace
          everything in [[BRACKETS]] with your truth before you send.
        </p>

        <div className="flex items-center gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <p className="text-2xl font-black text-accent">{stat.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
