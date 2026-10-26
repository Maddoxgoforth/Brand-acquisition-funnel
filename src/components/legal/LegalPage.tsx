import Container from "@/components/ui/Container";
import Footer from "@/components/sections/Footer";

// The address people can write to about their data. Change it here if you
// set up a business inbox.
export const CONTACT_EMAIL = "goforthkmaddox@gmail.com";
export const BUSINESS = "Mad Media LLC";
export const UPDATED = "October 26, 2026";

export default function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <main>
      <section className="py-16">
        <Container>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>
          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-lg font-extrabold">{s.heading}</h2>
                <div className="mt-2 space-y-3 text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <Footer />
    </main>
  );
}
