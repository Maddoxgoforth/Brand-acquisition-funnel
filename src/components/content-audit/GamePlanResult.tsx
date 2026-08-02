import Card from "@/components/ui/Card";

export type GamePlan = {
  niche: string;
  videoIdeas: string[];
  productIdeas: string[];
};

export default function GamePlanResult({ plan }: { plan: GamePlan }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          Your Free Game Plan
        </p>
        <h2 className="text-3xl font-extrabold sm:text-4xl">
          You&apos;re All Set
        </h2>
        <p className="max-w-md text-muted">
          We also sent a copy of this to your email so you don&apos;t lose it.
        </p>
      </div>

      <Card className="w-full text-left">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          Your Niche
        </p>
        <p className="mt-2 text-xl font-extrabold">{plan.niche}</p>
      </Card>

      <Card className="w-full text-left">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          Content Ideas
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {plan.videoIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-muted">{idea}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="w-full text-left">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          High-Ticket Product Ideas
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {plan.productIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-muted">{idea}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
