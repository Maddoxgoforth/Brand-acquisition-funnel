import Container from "@/components/ui/Container";
import Pill from "@/components/ui/Pill";
import WistiaEmbed from "@/components/ui/WistiaEmbed";

// The number the CRM dials leads from (Twilio caller ID), shown so leads
// recognise the call instead of ignoring an unknown number.
function callerNumber(): { display: string; tel: string } | null {
  const raw = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const us = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.length === 10 ? digits : null;
  return {
    display: us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : raw,
    tel: raw.startsWith("+") ? raw : `+${digits}`,
  };
}

export default function FreeCourseConfirmationHero() {
  const number = callerNumber();
  return (
    <section className="pt-12 pb-16">
      <Container className="flex flex-col items-center gap-4 text-center">
        <Pill>YOU&apos;RE IN</Pill>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          We&apos;ll Call You Within The Next 5 Minutes
        </h1>

        <p className="max-w-md text-muted">
          Keep your phone nearby. One of our team members is calling you
          shortly to get you set up.
        </p>

        {number && (
          <div className="w-full max-w-md rounded-2xl border-2 border-accent px-5 py-4">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">
              📞 Save this number
            </p>
            <a href={`tel:${number.tel}`} className="mt-1 block text-3xl font-extrabold text-accent">
              {number.display}
            </a>
            <p className="mt-1 text-sm">
              My team is calling you from this number in the next 5 minutes. Pick up!
            </p>
          </div>
        )}

        <p className="text-lg font-bold text-accent">
          Watch This Video To Confirm Your Spot
        </p>

        <WistiaEmbed mediaId="f54m0unjn2" aspect={0.5625} />
      </Container>
    </section>
  );
}
