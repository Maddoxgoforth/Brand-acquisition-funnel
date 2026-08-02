"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { QUESTIONS } from "./questions";
import GamePlanResult, { GamePlan } from "./GamePlanResult";

type Answers = Record<string, string>;
type LeadInfo = { name: string; email: string; phone: string };

type Status = "in-progress" | "submitting" | "done" | "error";

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [lead, setLead] = useState<LeadInfo>({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<Status>("in-progress");
  const [plan, setPlan] = useState<GamePlan | null>(null);

  const question = QUESTIONS[step];
  const isLastQuestion = step === QUESTIONS.length - 1;

  async function submit(finalAnswers: Answers, finalLead: LeadInfo) {
    setStatus("submitting");
    try {
      const res = await fetch("/api/content-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, lead: finalLead }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setPlan(data.plan);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function selectOption(value: string) {
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    if (isLastQuestion) {
      submit(nextAnswers, lead);
    } else {
      setStep(step + 1);
    }
  }

  function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (isLastQuestion) {
      submit(answers, lead);
    } else {
      setStep(step + 1);
    }
  }

  function submitText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(
      new FormData(e.currentTarget).get("text-answer") || ""
    ).trim();
    if (!value) return;
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    if (isLastQuestion) {
      submit(nextAnswers, lead);
    } else {
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  if (status === "submitting") {
    return (
      <Card className="w-full text-center">
        <p className="text-lg font-bold">Building your game plan...</p>
        <p className="mt-2 text-muted">This takes about 10 seconds.</p>
      </Card>
    );
  }

  if (status === "done" && plan) {
    return <GamePlanResult plan={plan} />;
  }

  if (status === "error") {
    return (
      <Card className="w-full text-center">
        <p className="text-lg font-bold text-danger">
          Something went wrong sending your game plan.
        </p>
        <p className="mt-2 text-muted">
          Try again, or reach out and we&apos;ll sort it out manually.
        </p>
        <button
          type="button"
          onClick={() => submit(answers, lead)}
          className="mt-5 rounded-xl bg-accent px-6 py-3 font-bold text-white hover:bg-accent-dim"
        >
          Try Again
        </button>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full items-center gap-2">
        {QUESTIONS.map((q, i) => (
          <div
            key={q.id}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-muted">
        Question {step + 1} of {QUESTIONS.length}
      </p>

      <Card className="w-full">
        <h2 className="text-xl font-extrabold">{question.question}</h2>
        {question.helper ? (
          <p className="mt-2 text-sm text-muted">{question.helper}</p>
        ) : null}

        {question.type === "select" ? (
          <div className="mt-6 flex flex-col gap-3">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectOption(option)}
                className="w-full rounded-xl border border-border bg-background px-5 py-4 text-left font-semibold transition-colors hover:border-accent hover:text-accent"
              >
                {option}
              </button>
            ))}
          </div>
        ) : question.type === "text" ? (
          <form
            key={step}
            onSubmit={submitText}
            className="mt-6 flex flex-col gap-4"
          >
            <textarea
              required
              name="text-answer"
              rows={4}
              placeholder={question.placeholder}
              defaultValue={answers[question.id] || ""}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-6 py-4 font-extrabold text-white hover:bg-accent-dim"
            >
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={submitLead} className="mt-6 flex flex-col gap-4">
            <input
              required
              type="text"
              placeholder="Full name"
              value={lead.name}
              onChange={(e) => setLead({ ...lead, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={lead.email}
              onChange={(e) => setLead({ ...lead, email: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <input
              required
              type="tel"
              placeholder="Phone number"
              value={lead.phone}
              onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent px-6 py-4 font-extrabold text-white hover:bg-accent-dim"
            >
              Continue
            </button>
          </form>
        )}
      </Card>

      {step > 0 ? (
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-semibold text-muted hover:text-foreground"
        >
          ← Back
        </button>
      ) : null}
    </div>
  );
}
