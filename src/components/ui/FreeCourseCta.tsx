"use client";

import { useState, type FormEvent } from "react";

export default function FreeCourseCta({
  label = "Get Free Access",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/free-course-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });

      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-accent px-10 py-7 text-center text-2xl font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim"
      >
        {label}
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
                  <span className="flex items-center rounded-xl border border-border bg-background-elevated px-3 text-muted">
                    +1
                  </span>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(201) 555-0123"
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
