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
];

const VIEWS_BEFORE_AFTER = {
  stat: "23.9K → 2.7M VIEWS",
  caption: "Same creator, same account — before and after learning the system",
  before: {
    src: "/images/testimonial-before-24k.jpg",
    alt: "TikTok video with 23.9K views before learning the content system",
    width: 397,
    height: 499,
  },
  after: {
    src: "/images/testimonial-after-2-7m.jpg",
    alt: "TikTok video with 2.7M views after learning the content system",
    width: 403,
    height: 528,
  },
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

        <Card className="w-full text-left">
          <p className="text-2xl font-extrabold text-accent">
            {VIEWS_BEFORE_AFTER.stat}
          </p>
          <p className="mt-1 text-sm text-muted">
            {VIEWS_BEFORE_AFTER.caption}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-muted">
                Before
              </p>
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={VIEWS_BEFORE_AFTER.before.src}
                  alt={VIEWS_BEFORE_AFTER.before.alt}
                  width={VIEWS_BEFORE_AFTER.before.width}
                  height={VIEWS_BEFORE_AFTER.before.height}
                  className="w-full h-auto"
                  sizes="(min-width: 576px) 256px, 50vw"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent">
                After
              </p>
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={VIEWS_BEFORE_AFTER.after.src}
                  alt={VIEWS_BEFORE_AFTER.after.alt}
                  width={VIEWS_BEFORE_AFTER.after.width}
                  height={VIEWS_BEFORE_AFTER.after.height}
                  className="w-full h-auto"
                  sizes="(min-width: 576px) 256px, 50vw"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <CtaButton
        label="WATCH THE FREE TRAINING"
        subtext="See exactly how Maddox does it"
        href="/#apply"
      />
    </div>
  );
}
