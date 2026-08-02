import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";

const DEREK_CLIPS = [
  { src: "/images/derek-4542-views.jpg", alt: "Derek's TikTok clip with 4,542 views" },
  { src: "/images/derek-375k-views.jpg", alt: "Derek's TikTok clip with 375K views" },
  { src: "/images/derek-157k-views.jpg", alt: "Derek's TikTok clip with 157K views" },
  { src: "/images/derek-1-8m-views.jpg", alt: "Derek's TikTok clip with 1.8M views" },
];

export default function MoreResults() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title={
            <>
              MORE <span className="text-accent">CLIENT RESULTS</span>
            </>
          }
          subtitle="More proof from people running the same system, while you wait for your call."
        />

        <Card className="w-full">
          <p className="text-3xl font-extrabold text-accent">$39,549</p>
          <p className="mt-1 text-sm text-muted">
            JJ — JJVending total sales, 116.46K sessions, 1.94% conversion
            rate
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/dashboard-jjvending.jpg"
              alt="JJVending Shopify dashboard showing $39,549 in total sales"
              width={1284}
              height={1289}
              className="w-full h-auto"
              sizes="(min-width: 576px) 512px, 100vw"
            />
          </div>
        </Card>

        <Card className="w-full">
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
      </Container>
    </section>
  );
}
