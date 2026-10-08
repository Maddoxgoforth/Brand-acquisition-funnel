// Small CSV reader for the import dialog. Handles quoted cells, commas and
// line breaks inside quotes, and tab- or semicolon-separated files.

function detectDelimiter(firstLine: string) {
  const counts = [",", "\t", ";"].map(
    (d) => [d, firstLine.split(d).length] as const
  );
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function parseRows(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(input.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const KNOWN_HEADER = /name|phone|mobile|cell|number|e-?mail/i;

export type ParsedCsv =
  | { ok: true; headers: string[]; leads: Record<string, string>[] }
  | { ok: false; error: string };

export function parseLeadsCsv(text: string): ParsedCsv {
  const rows = parseRows(text);
  if (rows.length === 0) return { ok: false, error: "Nothing to import yet." };

  const headers = rows[0].map((h) => h.trim());
  if (!headers.some((h) => KNOWN_HEADER.test(h))) {
    return {
      ok: false,
      error:
        "The first row needs column names, including at least one of: name, phone, email.",
    };
  }
  if (rows.length === 1) {
    return { ok: false, error: "Found column names but no leads under them." };
  }

  const leads = rows.slice(1).map((cells) => {
    const lead: Record<string, string> = {};
    headers.forEach((header, index) => {
      const value = (cells[index] ?? "").trim();
      if (header && value) lead[header] = value;
    });
    return lead;
  });
  return { ok: true, headers: headers.filter(Boolean), leads };
}
