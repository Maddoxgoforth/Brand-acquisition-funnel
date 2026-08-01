import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaButton from "@/components/ui/CtaButton";
import ShopifyDashboard from "@/components/mocks/ShopifyDashboard";
import DmThread from "@/components/mocks/DmThread";

const CHART_A = {
  path: "M0 92 L40 92 Q70 60 100 55 T160 60 T210 40 T240 -4 T300 8",
  area: "M0 92 L40 92 Q70 60 100 55 T160 60 T210 40 T240 -4 T300 8 L300 100 L0 100 Z",
  labels: ["Jul 2024", "Dec 2024"],
};

const CHART_B = {
  path: "M0 96 L40 96 Q80 55 110 50 T170 65 T220 88 T250 40 T300 4",
  area: "M0 96 L40 96 Q80 55 110 50 T170 65 T220 88 T250 40 T300 4 L300 100 L0 100 Z",
  labels: ["Jul 2024", "Nov 2024", "Mar 2025"],
};

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
          <div className="mt-5">
            <ShopifyDashboard
              storeInitials="JV"
              storeName="JT Vendors"
              dateRange="Jul 20, 2024 - May 8, 2025"
              stats={[
                { label: "Total sales", value: "$102,988.3", delta: "48.5K%" },
                { label: "Orders", value: "7.89K", delta: "30.2K%" },
                { label: "Conversion", value: "2.49%", delta: "32%" },
              ]}
              chartPath={CHART_A.path}
              chartAreaPath={CHART_A.area}
              chartLabels={CHART_A.labels}
            />
          </div>
        </Card>

        <Card className="w-full">
          <p className="text-4xl font-extrabold text-accent">$530</p>
          <p className="mt-1 text-sm text-muted">
            &ldquo;$530 I made because of you&rdquo; — a student&apos;s first
            days
          </p>
          <div className="mt-5">
            <DmThread />
          </div>
        </Card>

        <Card className="w-full">
          <p className="text-4xl font-extrabold text-accent">224K SESSIONS</p>
          <p className="mt-1 text-sm text-muted">
            JT Vendors — $74,090 in sales as it scaled
          </p>
          <div className="mt-5">
            <ShopifyDashboard
              storeInitials="JV"
              storeName="JT Vendors"
              dateRange="Jul 19, 2024 - Apr 23, 2025"
              stats={[
                { label: "Sessions", value: "224.44K", delta: "49.6K%" },
                { label: "Total sales", value: "$74,090.47", delta: "58.2K%" },
                { label: "Orders", value: "5.67K", delta: "31.4K%" },
              ]}
              chartPath={CHART_B.path}
              chartAreaPath={CHART_B.area}
              chartLabels={CHART_B.labels}
              footer={
                <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-600">
                  <p className="font-semibold text-zinc-900">
                    You&apos;re eligible to apply for funding through Shopify
                    Capital
                  </p>
                  <p className="mt-1">
                    Apply for up to{" "}
                    <span className="font-bold">$16,000</span>
                  </p>
                </div>
              }
            />
          </div>
        </Card>

        <CtaButton />
      </Container>
    </section>
  );
}
