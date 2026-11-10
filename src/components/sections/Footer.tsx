import Container from "@/components/ui/Container";
import { DisclaimerText } from "@/components/ad-funnel/Disclaimer";

// `disclaimer` adds the income and affiliate disclaimer (free course pages).
export default function Footer({ disclaimer = false }: { disclaimer?: boolean }) {
  return (
    <footer className="border-t border-border py-10">
      <Container className="flex flex-col items-center gap-4 text-center text-sm text-muted">
        {disclaimer && (
          <DisclaimerText className="max-w-md text-[11px] leading-snug text-muted/80" />
        )}
        <p>© {new Date().getFullYear()} Mad Media LLC. All Rights Reserved.</p>
        <div className="flex gap-6">
          <a href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-foreground">
            Terms And Conditions
          </a>
        </div>
      </Container>
    </footer>
  );
}
