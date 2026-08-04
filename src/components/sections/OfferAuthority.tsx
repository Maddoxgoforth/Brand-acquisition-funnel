import Image from "next/image";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import CtaButton from "@/components/ui/CtaButton";

const STATS = [
  { value: "$30K/MO", label: "selling digital products using AI" },
  { value: "400K+", label: "followers, 5.9M+ likes" },
  { value: "$100K+", label: "a single student's store did it" },
];

export default function OfferAuthority() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8">
        <div className="w-full overflow-hidden rounded-2xl border border-border shadow-lg">
          <Image
            src="/images/tiktok-profile.jpg"
            alt="Maddox Goforth's TikTok profile: @maddox.goforth, 290.2K followers, 5.9M likes"
            width={1206}
            height={1037}
            className="w-full h-auto"
            sizes="(min-width: 576px) 512px, 100vw"
          />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/images/mentor-headshot.jpg"
            alt="Maddox Goforth"
            width={205}
            height={205}
            className="h-24 w-24 rounded-full border-2 border-accent object-cover"
          />
          <p className="text-sm font-bold uppercase tracking-widest text-accent">
            Why Listen To Me
          </p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            MEET <span className="text-accent">MADDOX</span>
          </h2>
          <p className="max-w-md text-muted">
            Maddox built a 400K+ following and hit $30K/mo selling his own
            digital products using AI as a teenager. The membership is the
            same playbook he uses, distilled into weekly training you can
            follow at your own pace.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-4">
          {STATS.map((stat, i) => (
            <Card
              key={stat.value}
              className={`text-center ${i === 2 ? "col-span-2" : ""}`}
            >
              <p className="text-2xl font-extrabold text-accent">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </Card>
          ))}
        </div>

        <CtaButton
          label="LEARN DIRECTLY FROM ME — $50/MO"
          subtext="Get the same system I used."
          href="https://whop.com/checkout/plan_LYj5o1sOR9YRW"
        />
      </Container>
    </section>
  );
}
