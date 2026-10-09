"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  SOURCES,
  classifyField,
  toE164,
  type Lead,
  type SourceId,
} from "@/lib/crm/constants";
import { crmFetch } from "./api";
import { parseLeadsCsv } from "./csv";

type Result = { added: number; skipped: number; leads: Lead[] };

const NONE = "";
const FIRST_LAST = "__first_last__";

type Mapping = { name: string; phone: string; email: string };

// Best guess at which column holds what: by header first, then by what the
// values look like (so an oddly named phone column is still found).
function guessMapping(headers: string[], rows: Record<string, string>[]): Mapping {
  const byField = (field: string) =>
    headers.find((h) => classifyField(h) === field) ?? NONE;
  const byValues = (test: (value: string) => boolean) =>
    headers.find((h) => {
      const values = rows.map((r) => r[h]).filter(Boolean);
      return values.length > 0 && values.filter(test).length / values.length > 0.6;
    }) ?? NONE;

  const hasFirstLast = byField("first") && byField("last");
  return {
    name: byField("name") || (hasFirstLast ? FIRST_LAST : byField("first")),
    phone: byField("phone") || byValues((v) => toE164(v) !== null),
    email: byField("email") || byValues((v) => /^\S+@\S+\.\S+$/.test(v)),
  };
}

function applyMapping(
  headers: string[],
  rows: Record<string, string>[],
  mapping: Mapping
) {
  const first = headers.find((h) => classifyField(h) === "first") ?? NONE;
  const last = headers.find((h) => classifyField(h) === "last") ?? NONE;
  const used = new Set(
    [mapping.phone, mapping.email, ...(mapping.name === FIRST_LAST ? [first, last] : [mapping.name])].filter(Boolean)
  );
  return rows.map((row) => ({
    name:
      mapping.name === FIRST_LAST
        ? [row[first], row[last]].filter(Boolean).join(" ")
        : row[mapping.name] ?? "",
    phone: row[mapping.phone] ?? "",
    email: row[mapping.email] ?? "",
    extra: Object.fromEntries(
      Object.entries(row).filter(([key]) => !used.has(key))
    ),
  }));
}

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
  // The column picks the person changed by hand; anything not overridden
  // follows the automatic guess for the current file.
  const [overrides, setOverrides] = useState<Partial<Mapping>>({});
  const guessed = useMemo(
    () => (parsed?.ok ? guessMapping(parsed.headers, parsed.leads) : null),
    [parsed]
  );
  const mapping = guessed ? { ...guessed, ...overrides } : null;
  const dialable =
    parsed?.ok && mapping?.phone
      ? parsed.leads.filter((r) => toE164(r[mapping.phone] ?? "") !== null).length
      : 0;

  async function submit(leads: unknown[]) {
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
                if (file) {
                  setOverrides({});
                  setCsv(await file.text());
                }
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
            {parsed?.ok && mapping ? (
              <div className="space-y-2 rounded-xl bg-background-elevated p-3">
                <p className="text-sm">
                  <span className="font-bold">{parsed.leads.length} leads</span>{" "}
                  found. Check each field is reading the right column:
                </p>
                {(["name", "phone", "email"] as const).map((fieldName) => (
                  <label key={fieldName} className="flex items-center gap-2 text-sm">
                    <span className="w-14 shrink-0 font-semibold capitalize">{fieldName}</span>
                    <select
                      className={`${input} min-w-0 text-sm`}
                      value={mapping[fieldName]}
                      onChange={(e) =>
                        setOverrides((o) => ({ ...o, [fieldName]: e.target.value }))
                      }
                    >
                      <option value={NONE}>Not in this file</option>
                      {fieldName === "name" ? (
                        <option value={FIRST_LAST}>First name + last name</option>
                      ) : null}
                      {parsed.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {mapping.phone ? (
                  <p className="text-xs text-muted">
                    {dialable} of {parsed.leads.length} phone numbers can be dialed as
                    written. Every other column is kept as extra info.
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-danger">
                    No phone column picked. These leads will import without phone
                    numbers.
                  </p>
                )}
              </div>
            ) : null}
            {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={busy || !parsed?.ok}
                onClick={() =>
                  parsed?.ok &&
                  mapping &&
                  submit(applyMapping(parsed.headers, parsed.leads, mapping))
                }
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
