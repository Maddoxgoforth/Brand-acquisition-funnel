"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { FunnelId } from "@/lib/crm/constants";
import {
  attribution,
  identifyForAds,
  newEventId,
  pixelEvent,
  trackStep,
  visitorId,
} from "@/lib/tracking";

// Countries people can opt in from. UK numbers are often typed with the
// leading 0 ("07700 900123"), which is dropped once +44 is in front.
const COUNTRIES = [
  { id: "US", flag: "🇺🇸", code: "1", placeholder: "(201) 555-0123" },
  { id: "CA", flag: "🇨🇦", code: "1", placeholder: "(416) 555-0123" },
  { id: "UK", flag: "🇬🇧", code: "44", placeholder: "07700 900123" },
] as const;

// Full international number, e.g. "+44 7700900123", so the CRM can dial it.
function withCountryCode(countryId: string, raw: string) {
  const country = COUNTRIES.find((c) => c.id === countryId) ?? COUNTRIES[0];
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(country.code) && digits.length > 10) digits = digits.slice(country.code.length);
  digits = digits.replace(/^0+/, "");
  return `+${country.code} ${digits}`;
}

// `funnel` decides which CRM tab the lead lands in: "organic" (the main free
// course page) or "ads" (the /free-training quiz funnel). `answers` (the quiz)
// are saved on the lead. `locked` greys the button out until the VSL unlocks it.
export default function FreeCourseCta({
  label = "Get Free Access",
  funnel = "organic",
  answers,
  getAnswers,
  locked = false,
  lockedLabel,
}: {
  label?: string;
  funnel?: FunnelId;
  answers?: Record<string, string>;
  getAnswers?: () => Record<string, string>;
  locked?: boolean;
  lockedLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<string>("US");
  const countryInfo = COUNTRIES.find((c) => c.id === country) ?? COUNTRIES[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const eventId = newEventId();
    const fullPhone = withCountryCode(country, phone);

    try {
      const res = await fetch("/api/free-course-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: fullPhone,
          funnel,
          answers: getAnswers ? getAnswers() : answers,
          attribution: attribution(),
          eventId,
          visitor: visitorId(),
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      // Same event id as the server's Conversions API event: Meta keeps one.
      await identifyForAds(email, fullPhone);
      pixelEvent("Lead", { content_name: funnel === "ads" ? "free_course_ad_funnel" : "free_course" }, eventId);
      setStatus("success");
      router.push("/free-course/confirmation");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => {
          setOpen(true);
          trackStep(funnel, "form_open");
        }}
        className="w-full rounded-full bg-accent px-10 py-7 text-center text-2xl font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
      >
        {locked ? lockedLabel ?? `🔒 ${label}` : label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-6 py-10">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg">
            <div className="relative text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                Free Access
              </p>
              <p className="mt-1 text-xl font-extrabold">
                Claim Your Free Course
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute -top-1 right-0 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {status === "success" ? (
              <p className="mt-6 text-center text-muted">
                You&apos;re in! We&apos;ll give you a call in the next 5
                minutes to get you set up.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Drop your details below and we&apos;ll get you set up.
                </p>

                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  className="rounded-xl border border-border bg-background-elevated px-4 py-3 text-foreground placeholder:text-muted"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-xl border border-border bg-background-elevated px-4 py-3 text-foreground placeholder:text-muted"
                />
                <div className="flex gap-2">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    aria-label="Country code"
                    className="rounded-xl border border-border bg-background-elevated px-2 text-foreground"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.flag} +{c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={countryInfo.placeholder}
                    className="w-full rounded-xl border border-border bg-background-elevated px-4 py-3 text-foreground placeholder:text-muted"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-2 rounded-full bg-accent px-6 py-4 font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim disabled:opacity-60"
                >
                  {status === "submitting"
                    ? "Submitting..."
                    : "Claim My Free Course"}
                </button>

                {status === "error" ? (
                  <p className="text-sm text-danger">
                    Something went wrong. Try again.
                  </p>
                ) : null}

                <p className="text-center text-[11px] leading-snug text-muted/80">
                  By submitting, you agree to receive marketing texts and
                  emails about your application and onboarding. Consent is
                  not required to get the free course. Reply STOP to cancel
                  anytime, HELP for help.
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
