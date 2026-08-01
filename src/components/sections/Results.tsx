import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaButton from "@/components/ui/CtaButton";

export default function Results() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-10">
        <SectionHeading
          title={
            <>
              REAL STUDENT <span className="text-accent">RESULTS</span>
            </>
          }
          subtitle="Real Shopify dashboards and messages from people running the system."
        />

        <Card className="w-full">
          <p className="text-4xl font-extrabold text-accent">$102,988</p>
          <p className="mt-1 text-sm text-muted">
            JT Vendors — total sales, 7,890 orders
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/dashboard-102988.jpg"
              alt="JT Vendors Shopify dashboard showing $102,988.3 in total sales"
              width={1206}
              height={1169}
              className="w-full h-auto"
              sizes="(min-width: 576px) 512px, 100vw"
            />
          </div>
        </Card>

        <Card className="w-full">
          <p className="text-4xl font-extrabold text-accent">$530</p>
          <p className="mt-1 text-sm text-muted">
            &ldquo;$530 I made because of you&rdquo; — a student&apos;s first
            days
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/dm-530.jpg"
              alt="DM conversation where a student shares they made $530"
              width={1179}
              height={2133}
              className="w-full h-auto"
              sizes="(min-width: 576px) 512px, 100vw"
            />
          </div>
        </Card>

        <Card className="w-full">
          <p className="text-4xl font-extrabold text-accent">224K SESSIONS</p>
          <p className="mt-1 text-sm text-muted">
            JT Vendors — $74,090 in sales as it scaled
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/dashboard-224k.jpg"
              alt="JT Vendors Shopify dashboard showing 224.44K sessions and $74,090.47 in sales"
              width={1206}
              height={1879}
              className="w-full h-auto"
              sizes="(min-width: 576px) 512px, 100vw"
            />
          </div>
        </Card>

        <CtaButton />
      </Container>
    </section>
  );
}
