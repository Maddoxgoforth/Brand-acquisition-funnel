// Small print for the ad funnel pages (Meta reviews landing pages: income
// disclaimers and the paid-partnership disclosure need to be visible).
export default function Disclaimer() {
  return (
    <div className="space-y-3 text-center text-[11px] leading-snug text-muted/80">
      <p>
        This is free educational training that teaches a skill. It is not a business opportunity and not a
        guarantee of income. Any results shown are not typical, and your results will vary with your effort and
        circumstances. Affiliate disclosure: Mad Media LLC is paid when you sign up for the AI tool we recommend,
        which is how this course stays free. Not affiliated with or endorsed by Meta, Instagram or TikTok.
      </p>
      <p className="flex justify-center gap-4">
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        <a href="/terms" className="underline hover:text-foreground">
          Terms
        </a>
      </p>
      <p>© {new Date().getFullYear()} Mad Media LLC</p>
    </div>
  );
}
