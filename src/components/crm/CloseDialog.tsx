"use client";

import { useEffect, useState, type FormEvent } from "react";

import { CLOSE_PLANS, type ClosePlan, type Lead } from "@/lib/crm/constants";

// Shrinks a screenshot to at most 1600px wide/tall and re-encodes it as a
// JPEG, so uploads stay small (a few hundred KB) whatever the phone made.
async function toJpeg(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't an image we can read."));
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Asked whenever a lead moves to Closed (or its close details change):
// the plan and a screenshot of the successful payment are both required.
// Cancelling leaves the lead where it was.
export default function CloseDialog({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: Lead;
  onCancel: () => void;
  // Resolves to null when saved, or to an error message to show.
  onConfirm: (plan: ClosePlan, screenshot: string) => Promise<string | null>;
}) {
  const [plan, setPlan] = useState<ClosePlan | null>(lead.closePlan);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takeFile(file: Blob | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Use an image file (a screenshot).");
      return;
    }
    try {
      setError(null);
      setScreenshot(await toJpeg(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that image.");
    }
  }

  // Paste a screenshot straight from the clipboard (Cmd+V).
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        toJpeg(file)
          .then((image) => {
            setError(null);
            setScreenshot(image);
          })
          .catch(() => setError("Couldn't read that image."));
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!plan) return setError("Pick monthly or yearly.");
    if (!screenshot) return setError("Add a screenshot of the successful payment.");
    setBusy(true);
    setError(null);
    const problem = await onConfirm(plan, screenshot);
    if (problem) {
      setError(problem);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={onCancel}>
      <form
        noValidate
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-lg"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">🎉 Closed</p>
        <h2 className="mt-1 text-xl font-extrabold">
          {lead.status === "closed" ? "Update the close for" : "Closing"} {lead.name || "this lead"}
        </h2>

        <p className="mt-5 text-sm font-semibold">Which plan did they buy?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CLOSE_PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                plan === p.id ? "border-emerald-500 bg-emerald-50" : "border-border hover:border-emerald-300"
              }`}
            >
              <span className="block font-extrabold">{p.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-semibold">Screenshot of the successful payment</p>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void takeFile(e.dataTransfer.files[0]);
          }}
          className={`mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center text-sm transition-colors ${
            dragging ? "border-emerald-500 bg-emerald-50" : "border-border hover:border-emerald-300"
          }`}
        >
          {screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshot} alt="Payment screenshot" className="max-h-60 rounded-lg object-contain" />
          ) : (
            <>
              <span className="text-2xl">📸</span>
              <span className="mt-1 font-bold">Upload, drop or paste (⌘V) the screenshot</span>
              <span className="text-xs text-muted">It gets posted to #successful-payments</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void takeFile(e.target.files?.[0])}
          />
        </label>
        {screenshot ? (
          <button type="button" onClick={() => setScreenshot(null)} className="mt-1 text-xs font-bold text-muted hover:underline">
            Use a different screenshot
          </button>
        ) : null}

        {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-emerald-600 px-6 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {busy ? "Saving…" : lead.status === "closed" ? "Save" : "Mark as closed"}
          </button>
          <button type="button" onClick={onCancel} className="px-3 font-bold text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
