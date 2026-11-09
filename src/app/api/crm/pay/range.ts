// Reads ?from=&to= (ISO times). No `from` = since the beginning; no `to` = now.
export function readRange(url: string): { from: string | null; to: string } | null {
  const params = new URL(url).searchParams;
  const parse = (v: string | null) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const from = parse(params.get("from"));
  const to = parse(params.get("to"));
  if (from === null || to === null) return null;
  return { from: from ?? null, to: to ?? new Date().toISOString() };
}
