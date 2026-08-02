import Image from "next/image";
import Card from "@/components/ui/Card";
import CtaButton from "@/components/ui/CtaButton";

export type GamePlan = {
  niche: string;
  videoIdeas: string[];
  productIdeas: string[];
};

const TESTIMONIALS = [
  {
    stat: "$4,005 IN SALES",
    caption: "JT Vendors — total sales climbing week over week",
    src: "/images/testimonial-jtvendors-4005.jpg",
    alt: "JT Vendors Shopify dashboard showing $4,005.41 in total sales",
    width: 887,
    height: 970,
  },
  {
    stat: "$5K THIS MONTH",
    caption: "A student watching their store climb past $5,000 in a month",
    src: "/images/testimonial-5k-month.png",
    alt: "Shopify dashboard screenshot showing $5,000.94 in sales for the month",
    width: 828,
    height: 606,
  },
  {
    stat: "“ACTUALLY CRAZY QUALITY”",
    caption: "A real customer, happy with their order from a student's store",
    src: "/images/testimonial-dm-hoodie.jpg",
    alt: "DM conversation with a customer thanking a student for a high-quality order",
    width: 1170,
    height: 2140,
  },
];

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

      <div className="mt-4 flex w-full flex-col items-center gap-4">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          More Free Resources
        </p>
        <a
          href="/content-audit/hooks"
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-5 text-center font-extrabold text-white transition-colors hover:bg-accent-dim"
        >
          📄 100+ Free Viral Hook Templates
        </a>
      </div>

      <div className="flex w-full flex-col items-center gap-6">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">
          Real Client Results
        </p>
        {TESTIMONIALS.map((testimonial) => (
          <Card key={testimonial.src} className="w-full text-left">
            <p className="text-2xl font-extrabold text-accent">
              {testimonial.stat}
            </p>
            <p className="mt-1 text-sm text-muted">{testimonial.caption}</p>
            <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={testimonial.src}
                alt={testimonial.alt}
                width={testimonial.width}
                height={testimonial.height}
                className="w-full h-auto"
                sizes="(min-width: 576px) 512px, 100vw"
              />
            </div>
          </Card>
        ))}
      </div>

      <CtaButton
        label="WATCH THE FREE TRAINING"
        subtext="See exactly how Maddox does it"
        href="/#apply"
      />
    </div>
  );
}
