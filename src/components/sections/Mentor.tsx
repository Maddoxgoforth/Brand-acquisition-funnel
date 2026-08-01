import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import TikTokProfile from "@/components/mocks/TikTokProfile";

const STATS = [
  { value: "$20K/MO", label: "selling his own AI digital products" },
  { value: "290K+", label: "followers, 5.9M+ likes" },
  { value: "$100K+", label: "a single student's store did it" },
];

export default function Mentor() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-8">
        <TikTokProfile />

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">
            Your Mentor
          </p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            MEET <span className="text-accent">MADDOX</span>
          </h2>
          <p className="max-w-md text-muted">
            Maddox built a 290K+ following and hit $20K/mo selling his own AI
            digital products as a teenager. Now he coaches you one-on-one
            through the exact system he used, the same one his students run
            to do six figures from a single store.
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
      </Container>
    </section>
  );
}
