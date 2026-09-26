import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

const MODULES = [
  {
    label: "MODULE 1",
    title: "Anti-Comparison Mindset",
    body: "Break the loop and become the person who actually posts.",
    gradient: "from-rose-600 to-rose-900",
  },
  {
    label: "MODULE 2",
    title: "Content & Hook Mastery",
    body: "Write hooks that actually stop the scroll.",
    gradient: "from-blue-600 to-blue-900",
  },
  {
    label: "MODULE 3",
    title: "AI Integration",
    body: "Wire up AI to do the heavy lifting across your content and offer.",
    gradient: "from-indigo-600 to-indigo-900",
  },
  {
    label: "MODULE 4",
    title: "Offer Creation",
    body: "The exact scripts and templates to build your first AI digital product.",
    gradient: "from-sky-600 to-sky-900",
  },
  {
    label: "TOOL",
    title: "AI Content Superagents",
    body: "Autonomous AI that scripts and plans content on its own.",
    gradient: "from-violet-600 to-violet-900",
  },
  {
    label: "WORKSHOP",
    title: "3-Day Workshop",
    body: "Your whole setup walked through step by step, start to finish.",
    gradient: "from-slate-700 to-slate-900",
  },
];

export default function FreeCourseModules() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading title="The Full Program. Completely Free." />

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {MODULES.map((mod) => (
            <div
              key={mod.title}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <div
                className={`flex h-32 items-center justify-center bg-gradient-to-br ${mod.gradient} px-4 text-center text-lg font-extrabold text-white`}
              >
                {mod.title}
              </div>
              <div className="bg-background-elevated p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    {mod.label}
                  </p>
                  <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                    Included
                  </span>
                </div>
                <p className="mt-2 text-base font-extrabold">{mod.title}</p>
                <p className="mt-1 text-sm text-muted">{mod.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
