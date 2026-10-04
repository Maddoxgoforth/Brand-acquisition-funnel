import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

const RESULTS = [
  {
    stat: "$102,988",
    caption: "JT Vendors: total sales, 7,890 orders",
    src: "/images/dashboard-102988.jpg",
    alt: "JT Vendors Shopify dashboard showing $102,988.3 in total sales",
    width: 1206,
    height: 1169,
  },
  {
    stat: "$530",
    caption: "“$530 I made because of you,” a student's first days",
    src: "/images/dm-530.jpg",
    alt: "DM conversation where a student shares they made $530",
    width: 1179,
    height: 2133,
  },
  {
    stat: "$4,005 IN SALES",
    caption: "JT Vendors: total sales climbing week over week",
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
    stat: "224K SESSIONS",
    caption: "JT Vendors: $74,090 in sales as it scaled",
    src: "/images/dashboard-224k.jpg",
    alt: "JT Vendors Shopify dashboard showing 224.44K sessions and $74,090.47 in sales",
    width: 1206,
    height: 1879,
  },
  {
    stat: "$39,549",
    caption: "JJ: JJVending total sales, 116.46K sessions",
    src: "/images/dashboard-jjvending.jpg",
    alt: "JJVending Shopify dashboard showing $39,549 in total sales",
    width: 1284,
    height: 1289,
  },
  {
    stat: "10,000 ORDERS ×2",
    caption: "JT Vendors: two 10,000-order Shopify plaques, bought an AMG with it",
    src: "/images/testimonial-jtvendors-10k-plaques.jpg",
    alt: "JT Vendors holding two Shopify 10,000-order milestone plaques",
    width: 1206,
    height: 1153,
  },
];

const DEREK_CLIPS = [
  { src: "/images/derek-4542-views.jpg", alt: "Derek's TikTok clip with 4,542 views" },
  { src: "/images/derek-375k-views.jpg", alt: "Derek's TikTok clip with 375K views" },
  { src: "/images/derek-157k-views.jpg", alt: "Derek's TikTok clip with 157K views" },
  { src: "/images/derek-1-8m-views.jpg", alt: "Derek's TikTok clip with 1.8M views" },
];

export default function FreeCourseResults() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="Results"
          title="What Students Are Saying"
          subtitle="This is the exact same system already covered in the free course. Here's proof it works."
        />

        {RESULTS.map((result) => (
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

        <Card className="w-full text-left">
          <p className="text-3xl font-extrabold text-accent">
            3K → 1.8M views
          </p>
          <p className="mt-1 text-sm text-muted">
            Derek: taken from getting low views to high views
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

        <FreeCourseCta label="Start Your Own Results, Free" />
      </Container>
    </section>
  );
}
