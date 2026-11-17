import { query } from "./db";
import { hashPassword, MIN_PASSWORD_LENGTH, passwordMatches } from "./users";

// Partner self-service: their marketing assets and account settings
// (/partner/assets, /partner/settings). Every function is scoped to the
// signed-in partner's id.

export const ASSET_KINDS = [
  ["vsl", "VSL"],
  ["webinar", "Webinar"],
  ["ad", "Ad campaign"],
  ["document", "Document / PDF"],
  ["social", "Social post"],
  ["other", "Other"],
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number][0];
export const assetKindLabel = (k: string) => ASSET_KINDS.find(([v]) => v === k)?.[1] ?? "Other";

export type PartnerAsset = { id: string; kind: AssetKind; title: string; url: string; notes: string; createdAt: string };

export async function listPartnerAssets(partnerId: string, sort: "recent" | "oldest" | "name" = "recent", q = "") {
  const order = sort === "name" ? "lower(title) ASC" : sort === "oldest" ? "created_at ASC" : "created_at DESC";
  const rows = await query<{ id: string; kind: AssetKind; title: string; url: string; notes: string; created_at: string | Date }>(
    `SELECT id, kind, title, url, notes, created_at FROM crm_partner_assets
     WHERE partner_id = $1 AND ($2 = '' OR title ILIKE '%' || $2 || '%' OR notes ILIKE '%' || $2 || '%')
     ORDER BY ${order}`,
    [partnerId, q.trim().slice(0, 100)]
  );
  return rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, url: r.url, notes: r.notes, createdAt: new Date(r.created_at).toISOString() }));
}

export async function addPartnerAsset(partnerId: string, input: { kind: string; title: string; url: string; notes: string }) {
  const title = input.title.trim().slice(0, 140);
  let url = input.url.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "bad_url" as const;
  } catch {
    return "bad_url" as const;
  }
  if (!title) return "missing_title" as const;
  const kind = ASSET_KINDS.some(([k]) => k === input.kind) ? input.kind : "other";
  const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM crm_partner_assets WHERE partner_id = $1`, [partnerId]);
  if (n >= 200) return "full" as const;
  await query(`INSERT INTO crm_partner_assets (partner_id, kind, title, url, notes) VALUES ($1, $2, $3, $4, $5)`, [
    partnerId,
    kind,
    title,
    url.slice(0, 1000),
    input.notes.trim().slice(0, 500),
  ]);
  return "added" as const;
}

export async function deletePartnerAsset(partnerId: string, assetId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return;
  await query(`DELETE FROM crm_partner_assets WHERE id = $1 AND partner_id = $2`, [assetId, partnerId]);
}

export async function updatePartnerName(partnerId: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!clean) return "missing_name" as const;
  await query(`UPDATE crm_partners SET name = $2 WHERE id = $1`, [partnerId, clean]);
  return "saved" as const;
}

export async function changePartnerPassword(partnerId: string, current: string, next: string, confirm: string) {
  const [row] = await query<{ password_hash: string }>(`SELECT password_hash FROM crm_partners WHERE id = $1`, [partnerId]);
  if (!row || !(await passwordMatches(current, row.password_hash))) return "wrong_current" as const;
  if (next.length < MIN_PASSWORD_LENGTH || next.length > 200) return "too_short" as const;
  if (next !== confirm) return "mismatch" as const;
  await query(`UPDATE crm_partners SET password_hash = $2 WHERE id = $1`, [partnerId, await hashPassword(next)]);
  return "changed" as const;
}
