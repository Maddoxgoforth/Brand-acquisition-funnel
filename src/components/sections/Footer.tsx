import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <Container className="flex flex-col items-center gap-4 text-center text-sm text-muted">
        <p>© 2025 Maddox. All Rights Reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-foreground">
            Terms And Conditions
          </a>
        </div>
      </Container>
    </footer>
  );
}
