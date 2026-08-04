import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaButton from "@/components/ui/CtaButton";

const DASHBOARD_RESULTS = [
  {
    stat: "$102,988",
    caption: "JT Vendors — total sales, 7,890 orders",
    src: "/images/dashboard-102988.jpg",
    alt: "JT Vendors Shopify dashboard showing $102,988.3 in total sales",
    width: 1206,
    height: 1169,
  },
  {
    stat: "224K SESSIONS",
    caption: "JT Vendors — $74,090 in sales as it scaled",
    src: "/images/dashboard-224k.jpg",
    alt: "JT Vendors Shopify dashboard showing 224.44K sessions and $74,090.47 in sales",
    width: 1206,
    height: 1879,
  },
  {
    stat: "$39,549",
    caption: "JJ — JJVending total sales, 116.46K sessions",
    src: "/images/dashboard-jjvending.jpg",
    alt: "JJVending Shopify dashboard showing $39,549 in total sales",
    width: 1284,
    height: 1289,
  },
];

const MESSAGE_RESULTS = [
  {
    stat: "$530",
    caption: "“$530 I made because of you” — a student's first days",
    src: "/images/dm-530.jpg",
    alt: "DM conversation where a student shares they made $530",
    width: 1179,
    height: 2133,
  },
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

const DEREK_CLIPS = [
  { src: "/images/derek-4542-views.jpg", alt: "Derek's TikTok clip with 4,542 views" },
  { src: "/images/derek-375k-views.jpg", alt: "Derek's TikTok clip with 375K views" },
  { src: "/images/derek-157k-views.jpg", alt: "Derek's TikTok clip with 157K views" },
  { src: "/images/derek-1-8m-views.jpg", alt: "Derek's TikTok clip with 1.8M views" },
];

export default function OfferResults() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="Real Results"
          title={
            <>
              This Isn&apos;t <span className="text-accent">Theory</span>
            </>
          }
          subtitle="Real Shopify dashboards and messages from people running the same system."
        />

        {DASHBOARD_RESULTS.map((result) => (
          <Card key={result.src} className="w-full text-left">
            <p className="text-3xl font-extrabold text-accent">
              {result.stat}
            </p>
            <p className="mt-1 text-sm text-muted">{result.caption}</p>
            <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={result.src}
                alt={result.alt}
                width={result.width}
                height={result.height}
                className="w-full h-auto"
                sizes="(min-width: 576px) 512px, 100vw"
              />
            </div>
          </Card>
        ))}

        <CtaButton
          label="START YOUR OWN RESULTS — $50/MO"
          subtext="This could be your dashboard next."
          href="#checkout"
        />

        {MESSAGE_RESULTS.map((result) => (
          <Card key={result.src} className="w-full text-left">
            <p className="text-3xl font-extrabold text-accent">
              {result.stat}
            </p>
            <p className="mt-1 text-sm text-muted">{result.caption}</p>
            <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={result.src}
                alt={result.alt}
                width={result.width}
                height={result.height}
                className="w-full h-auto"
                sizes="(min-width: 576px) 512px, 100vw"
              />
            </div>
          </Card>
        ))}

        <CtaButton
          label="BE THE NEXT SUCCESS STORY — $50/MO"
          subtext="No experience needed to start."
          href="#checkout"
        />

        <Card className="w-full text-left">
          <p className="text-3xl font-extrabold text-accent">
            3K → 1.8M views
          </p>
          <p className="mt-1 text-sm text-muted">
            Derek — taken from getting low views to high views
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {DEREK_CLIPS.map((clip) => (
              <div
                key={clip.src}
                className="overflow-hidden rounded-2xl shadow-lg"
              >
                <Image
                  src={clip.src}
                  alt={clip.alt}
                  width={400}
                  height={700}
                  className="w-full h-auto"
                  sizes="(min-width: 576px) 256px, 50vw"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="w-full text-left">
          <p className="text-3xl font-extrabold text-accent">
            23.9K → 2.7M VIEWS
          </p>
          <p className="mt-1 text-sm text-muted">
            Same creator, same account — before and after learning the system
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-muted">
                Before
              </p>
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src="/images/testimonial-before-24k.jpg"
                  alt="TikTok video with 23.9K views before learning the content system"
                  width={397}
                  height={499}
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
                  src="/images/testimonial-after-2-7m.jpg"
                  alt="TikTok video with 2.7M views after learning the content system"
                  width={403}
                  height={528}
                  className="w-full h-auto"
                  sizes="(min-width: 576px) 256px, 50vw"
                />
              </div>
            </div>
          </div>
        </Card>

        <CtaButton
          label="UNLOCK THE PLAYBOOK — $50/MO"
          subtext="Cancel anytime. Start whenever you're ready."
          href="#checkout"
        />
      </Container>
    </section>
  );
}
