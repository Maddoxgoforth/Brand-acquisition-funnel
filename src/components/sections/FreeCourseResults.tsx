import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import FreeCourseCta from "@/components/ui/FreeCourseCta";

const RESULTS = [
  {
    stat: "$102,988",
    caption: "JT Vendors — total sales, 7,890 orders",
    src: "/images/dashboard-102988.jpg",
    alt: "JT Vendors Shopify dashboard showing $102,988.3 in total sales",
    width: 1206,
    height: 1169,
  },
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

export default function FreeCourseResults() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="Results"
          title="What Students Are Saying"
          subtitle="This is the exact same system already covered in the free course — here's proof it works."
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

        <FreeCourseCta label="Start Your Own Results — Free" />
      </Container>
    </section>
  );
}
