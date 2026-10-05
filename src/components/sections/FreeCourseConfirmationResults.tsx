import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";

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
    stat: "10,000 ORDERS ×2",
    caption: "JT Vendors: two 10,000-order Shopify plaques, bought an AMG with it",
    src: "/images/testimonial-jtvendors-10k-plaques.jpg",
    alt: "JT Vendors holding two Shopify 10,000-order milestone plaques",
    width: 1206,
    height: 1153,
  },
  {
    stat: "$530",
    caption: "“$530 I made because of you,” a student's first days",
    src: "/images/dm-530.jpg",
    alt: "DM conversation where a student shares they made $530",
    width: 1179,
    height: 2133,
  },
];

export default function FreeCourseConfirmationResults() {
  return (
    <section className="pb-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="While You Wait"
          title="Real Student Results"
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
      </Container>
    </section>
  );
}
