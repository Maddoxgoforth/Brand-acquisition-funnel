"use client";

import { useMemo, useState, type FormEvent } from "react";

import { SOURCES, type Lead, type SourceId } from "@/lib/crm/constants";
import { crmFetch } from "./api";
import { parseLeadsCsv } from "./csv";

type Result = { added: number; skipped: number; leads: Lead[] };

const input =
  "w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-accent";

export default function AddLeadsDialog({
  source,
  mode,
  onClose,
  onAdded,
}: {
  source: SourceId;
  mode: "single" | "import";
  onClose: () => void;
  onAdded: (leads: Lead[]) => void;
}) {
  const list = SOURCES.find((s) => s.id === source)!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [csv, setCsv] = useState("");
  const parsed = useMemo(() => (csv.trim() ? parseLeadsCsv(csv) : null), [csv]);

  async function submit(leads: Record<string, string>[]) {
    setBusy(true);
    setError(null);
    try {
      const response = await crmFetch<Result>("/api/crm/leads", {
        method: "POST",
        body: { source, leads },
      });
      setResult(response);
      onAdded(response.leads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add leads.");
    } finally {
      setBusy(false);
    }
  }

  function handleSingle(event: FormEvent) {
    event.preventDefault();
    submit([{ name, phone, email }]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          {list.label}
        </p>
        <h2 className="mt-1 text-xl font-extrabold">
          {mode === "single" ? "Add a lead" : "Import leads"}
        </h2>

        {result ? (
          <div className="mt-5">
            <p className="font-semibold">
              Added {result.added} lead{result.added === 1 ? "" : "s"}.
            </p>
            {result.skipped > 0 ? (
              <p className="mt-1 text-sm text-muted">
                Skipped {result.skipped} that were already in this list, repeated
                in the file, or had no name, phone or email.
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-accent px-6 py-2.5 font-bold text-white hover:bg-accent-dim"
            >
              Done
            </button>
          </div>
        ) : mode === "single" ? (
          <form onSubmit={handleSingle} className="mt-5 space-y-3">
            <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <input className={input} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className={input} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={busy || (!name && !phone && !email)}
                className="rounded-full bg-accent px-6 py-2.5 font-bold text-white hover:bg-accent-dim disabled:opacity-40"
              >
                {busy ? "Adding…" : "Add lead"}
              </button>
              <button type="button" onClick={onClose} className="px-3 font-bold text-muted hover:text-foreground">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted">
              Upload a CSV or paste rows from a spreadsheet. The first row must
              be column names. Columns called name, phone and email are picked
              up automatically; every other column is kept on the lead as extra
              info.
            </p>
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setCsv(await file.text());
              }}
              className="block w-full text-sm"
            />
            <textarea
              className={`${input} h-36 font-mono text-xs`}
              placeholder={"name,phone,email,what they bought\nJane Doe,555-123-4567,jane@example.com,Free course"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            {parsed && !parsed.ok ? (
              <p className="text-sm font-semibold text-danger">{parsed.error}</p>
            ) : null}
            {parsed?.ok ? (
              <p className="text-sm">
                <span className="font-bold">{parsed.leads.length} leads</span>{" "}
                found. Columns: {parsed.headers.join(", ")}
              </p>
            ) : null}
            {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={busy || !parsed?.ok}
                onClick={() => parsed?.ok && submit(parsed.leads)}
                className="rounded-full bg-accent px-6 py-2.5 font-bold text-white hover:bg-accent-dim disabled:opacity-40"
              >
                {busy ? "Importing…" : "Import"}
              </button>
              <button type="button" onClick={onClose} className="px-3 font-bold text-muted hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
