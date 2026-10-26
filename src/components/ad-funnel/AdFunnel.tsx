"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { pixelCustom, trackStep } from "@/lib/tracking";
import Disclaimer from "./Disclaimer";
import { ANSWERS_KEY, QUESTIONS, buildPlan, type Answers } from "./quiz";

type Stage = { kind: "intro" } | { kind: "question"; index: number } | { kind: "analyzing" } | { kind: "plan" };

const ANALYZING_STEPS = [
  "Analyzing your answers",
  "Building your personalized plan",
  "Setting up your free access",
];

function saveAnswers(answers: Answers) {
  try {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  } catch {
    // Private mode: the opt-in just goes without the answers.
  }
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

export default function AdFunnel() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [answers, setAnswers] = useState<Answers>({});

  useEffect(() => {
    trackStep("ads", "view");
  }, []);

  const total = QUESTIONS.length;
  const progress =
    stage.kind === "intro" ? 0.05 : stage.kind === "question" ? (stage.index + 1) / (total + 1) : 1;

  function next(index: number, updated: Answers) {
    if (index + 1 < total) {
      setStage({ kind: "question", index: index + 1 });
    } else {
      saveAnswers(updated);
      trackStep("ads", "quiz_done");
      pixelCustom("QuizComplete");
      setStage({ kind: "analyzing" });
    }
  }

  function choose(index: number, optionId: string) {
    const q = QUESTIONS[index];
    if (q.multi) {
      const current = answers[q.id] ?? [];
      const picked = current.includes(optionId)
        ? current.filter((x) => x !== optionId)
        : [...current, optionId];
      setAnswers({ ...answers, [q.id]: picked });
      return;
    }
    const updated = { ...answers, [q.id]: [optionId] };
    setAnswers(updated);
    // A short beat so the tap registers visually before moving on.
    setTimeout(() => next(index, updated), 180);
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-5">
        {stage.kind !== "analyzing" ? (
          <div className="flex items-center gap-3">
            {stage.kind === "question" ? (
              <button
                type="button"
                aria-label="Back"
                onClick={() =>
                  setStage(stage.index === 0 ? { kind: "intro" } : { kind: "question", index: stage.index - 1 })
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
              >
                ←
              </button>
            ) : null}
            <ProgressBar value={progress} />
          </div>
        ) : null}

        {stage.kind === "intro" ? (
          <Intro
            onStart={() => {
              trackStep("ads", "quiz_start");
              setStage({ kind: "question", index: 0 });
            }}
          />
        ) : null}

        {stage.kind === "question" ? (
          <QuestionStep
            key={QUESTIONS[stage.index].id}
            index={stage.index}
            picked={answers[QUESTIONS[stage.index].id] ?? []}
            onChoose={(id) => choose(stage.index, id)}
            onContinue={() => next(stage.index, answers)}
          />
        ) : null}

        {stage.kind === "analyzing" ? <Analyzing onDone={() => setStage({ kind: "plan" })} /> : null}

        {stage.kind === "plan" ? (
          <Plan answers={answers} onUnlock={() => router.push("/free-training/watch")} />
        ) : null}

        <div className="mt-auto pt-10">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
        Discover The{" "}
        <span className="rounded-lg bg-accent px-2 text-white">Personal Brand System</span> I Used To Go From
        Broke To Running My Own Online Business
      </h1>
      <p className="mt-4 text-sm text-muted">Finish this quick quiz to unlock my free course at the end.</p>
      <div className="relative mt-6 aspect-[5/4] w-full overflow-hidden rounded-3xl border border-border shadow-lg">
        <Image
          src="/images/maddox-porsche.jpg"
          alt="Maddox next to his Porsche"
          fill
          priority
          sizes="(max-width: 448px) 100vw, 420px"
          className="object-cover"
        />
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full rounded-full bg-accent px-8 py-5 text-xl font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim"
      >
        START NOW →
      </button>
      <p className="mt-3 text-sm font-semibold text-muted">⚡ Takes less than 60 seconds</p>
    </div>
  );
}

function QuestionStep({
  index,
  picked,
  onChoose,
  onContinue,
}: {
  index: number;
  picked: string[];
  onChoose: (id: string) => void;
  onContinue: () => void;
}) {
  const q = QUESTIONS[index];
  const grid = !q.multi && q.options.length === 2;
  return (
    <div className="mt-10 flex flex-col text-center">
      {q.kicker ? <p className="text-2xl font-extrabold leading-snug">{q.kicker}</p> : null}
      {q.kicker && q.note ? <p className="mt-3 text-sm font-semibold text-accent">{q.note}</p> : null}
      <h2 className={`${q.kicker ? "mt-6 text-lg" : "text-2xl"} font-extrabold leading-snug`}>{q.title}</h2>
      {!q.kicker && q.note ? <p className="mt-2 text-sm text-muted">{q.note}</p> : null}

      <div className={`mt-6 ${grid ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}`}>
        {q.options.map((o, i) => {
          const on = picked.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChoose(o.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left font-bold transition-colors ${
                grid ? "justify-center" : ""
              } ${on ? "border-accent bg-background-elevated" : "border-border bg-background hover:border-accent"}`}
            >
              {q.letters ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-elevated text-sm text-accent">
                  {String.fromCharCode(65 + i)}
                </span>
              ) : o.emoji ? (
                <span className="text-2xl">{o.emoji}</span>
              ) : q.multi ? (
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm text-white ${
                    on ? "border-accent bg-accent" : "border-border"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              ) : null}
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {q.multi ? (
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={onContinue}
          className="mt-6 rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim disabled:bg-slate-300 disabled:shadow-none"
        >
          Continue →
        </button>
      ) : null}
    </div>
  );
}

function Analyzing({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - started) / 3200) * 100));
      setPct(p);
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => doneRef.current(), 300);
      }
    }, 60);
    return () => clearInterval(timer);
  }, []);
  const done = Math.floor((pct / 100) * ANALYZING_STEPS.length);
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <p className="text-2xl font-extrabold">{ANALYZING_STEPS[0]}</p>
      <p className="mt-6 text-5xl font-extrabold tabular-nums text-accent">{pct}%</p>
      <div className="mt-6 w-full">
        <ProgressBar value={pct / 100} />
      </div>
      <ul className="mt-8 space-y-3 text-left">
        {ANALYZING_STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 font-semibold ${i < done ? "text-foreground" : "text-muted"}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${i < done ? "bg-accent" : "bg-slate-300"}`}>
              {i < done ? "✓" : ""}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const box = (value: number, unit: string) => (
    <div className="flex w-16 flex-col items-center rounded-xl bg-red-50 py-2">
      <span className="text-2xl font-extrabold tabular-nums text-danger">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] font-bold uppercase text-danger/70">{unit}</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">Your free spot is held for</p>
      <div className="mt-2 flex items-center gap-2">
        {box(Math.floor(left / 60), "min")}
        <span className="text-xl font-extrabold text-danger">:</span>
        {box(left % 60, "sec")}
      </div>
    </div>
  );
}

function Plan({ answers, onUnlock }: { answers: Answers; onUnlock: () => void }) {
  const plan = buildPlan(answers);
  return (
    <div className="mt-8 flex flex-col text-center">
      <Countdown seconds={10 * 60} />
      <h1 className="mt-6 text-3xl font-extrabold leading-tight">Your Free Plan Is Ready</h1>
      <p className="mt-2 text-sm italic text-muted">Based on your answers, here&apos;s the path we mapped for you.</p>

      <p className="mt-6 text-lg font-bold leading-snug">
        You&apos;re a <span className="text-accent">{plan.level}</span>. Your next milestone:{" "}
        <span className="text-accent">{plan.milestone}</span>.
      </p>

      <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background-elevated to-background p-5 text-left">
        <svg viewBox="0 0 300 150" className="h-40 w-full" aria-hidden>
          <defs>
            <linearGradient id="planFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M20 128 C 110 128, 150 40, 270 26 L 270 150 L 20 150 Z" fill="url(#planFill)" />
          <path d="M20 128 C 110 128, 150 40, 270 26" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
          <circle cx="270" cy="26" r="9" fill="#2563eb" opacity="0.25" />
          <circle cx="270" cy="26" r="5" fill="#2563eb" />
          <circle cx="20" cy="128" r="5" fill="#94a3b8" />
        </svg>
        <div className="absolute right-5 top-4 text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">90 days</p>
          <p className="text-sm font-extrabold capitalize">{plan.milestone}</p>
        </div>
        <div className="absolute bottom-4 left-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Today</p>
          <p className="text-sm font-extrabold">{plan.today}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-left text-sm">
        {plan.phases.map((p, i) => (
          <li key={p.when} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-white">
              {i + 1}
            </span>
            <span>
              <span className="font-bold text-accent">{p.when}:</span> <span className="font-semibold">{p.title}</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onUnlock}
        className="mt-6 whitespace-nowrap rounded-full bg-accent px-6 py-5 text-lg font-extrabold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-dim"
      >
        UNLOCK MY FREE COURSE →
      </button>
      <p className="mt-3 text-xs text-muted">Your milestone is a goal to work toward, not a promise of results.</p>
    </div>
  );
}
