import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { query } from "./db";
import { DEMO_PAYOUT_METHOD, isDemoId } from "./partnerDemo";

// Where a Mad Media partner wants to be paid (owner's request, Nov 16 2026).
// The partner enters it on /partner/payments; the owner sees it on the
// partner's card in the CRM. Bank routing and account numbers are encrypted
// with AES-256-GCM using PARTNER_PAYOUT_KEY (32 bytes, base64 or hex, e.g.
// `openssl rand -base64 32`). Without that key nothing is saved (fail closed).
// The partner only ever sees the last 4 digits back; only the owner can read
// the full numbers (GET /api/crm/partners/[id]/payout-details).

// Nov 25 2026 (owner): payouts can go to a business account too. Stored in
// account_type as checking | savings | business_checking | business_savings.
export type AccountType = "checking" | "savings" | "business_checking" | "business_savings";
const ACCOUNT_TYPES: AccountType[] = ["checking", "savings", "business_checking", "business_savings"];
export const toAccountType = (v: string): AccountType =>
  ACCOUNT_TYPES.includes(v as AccountType) ? (v as AccountType) : "checking";
export const isBusinessAccount = (t: AccountType) => t.startsWith("business_");
export const accountTypeLabel = (t: AccountType) =>
  `${isBusinessAccount(t) ? "Business " : ""}${t.endsWith("savings") ? "savings" : "checking"}`.replace(/^./, (c) => c.toUpperCase());

export type PayoutSummary = {
  holderName: string;
  bankName: string;
  accountType: AccountType;
  routingLast4: string;
  accountLast4: string;
  updatedAt: string;
};

export type PayoutFull = PayoutSummary & { routingNumber: string; accountNumber: string };

function key(): Buffer | null {
  const raw = (process.env.PARTNER_PAYOUT_KEY || "").trim();
  if (!raw) return null;
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

export const payoutsConfigured = () => key() !== null;

function encrypt(plain: string, k: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${data.toString("base64")}`;
}

function decrypt(box: string, k: Buffer) {
  const [v, iv, tag, data] = box.split(".");
  if (v !== "v1") throw new Error("unknown format");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}

// US ABA routing number: 9 digits with the 3-7-1 checksum.
export function validRouting(n: string) {
  if (!/^\d{9}$/.test(n)) return false;
  const d = n.split("").map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
}

export type SaveResult =
  | "saved"
  | "not_configured"
  | "missing_name"
  | "bad_routing"
  | "bad_account"
  | "account_mismatch";

export async function savePayoutDetails(
  partnerId: string,
  input: { holderName: string; bankName: string; payee: string; accountType: string; routing: string; account: string; accountConfirm: string }
): Promise<SaveResult> {
  const k = key();
  if (!k) return "not_configured";
  const holderName = input.holderName.trim().slice(0, 120);
  const bankName = input.bankName.trim().slice(0, 120);
  const routing = input.routing.replace(/\D/g, "");
  const account = input.account.replace(/\D/g, "");
  const confirm = input.accountConfirm.replace(/\D/g, "");
  if (!holderName) return "missing_name";
  if (!validRouting(routing)) return "bad_routing";
  if (!/^\d{4,17}$/.test(account)) return "bad_account";
  if (account !== confirm) return "account_mismatch";
  const kind = input.accountType === "savings" ? "savings" : "checking";
  const accountType: AccountType = input.payee === "business" ? `business_${kind}` : kind;
  const secret = encrypt(JSON.stringify({ routing, account }), k);
  await query(
    `INSERT INTO crm_partner_payout_details (partner_id, holder_name, bank_name, account_type, routing_last4, account_last4, secret, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (partner_id) DO UPDATE SET holder_name = $2, bank_name = $3, account_type = $4,
       routing_last4 = $5, account_last4 = $6, secret = $7, updated_at = now()`,
    [partnerId, holderName, bankName, accountType, routing.slice(-4), account.slice(-4), secret]
  );
  return "saved";
}

type Row = {
  holder_name: string;
  bank_name: string;
  account_type: string;
  routing_last4: string;
  account_last4: string;
  secret: string;
  updated_at: string | Date;
};

const summary = (r: Row): PayoutSummary => ({
  holderName: r.holder_name,
  bankName: r.bank_name,
  accountType: toAccountType(r.account_type),
  routingLast4: r.routing_last4,
  accountLast4: r.account_last4,
  updatedAt: new Date(r.updated_at).toISOString(),
});

// Masked: safe to show the partner and the owner's partner list.
export async function payoutSummary(partnerId: string): Promise<PayoutSummary | null> {
  if (isDemoId(partnerId)) return DEMO_PAYOUT_METHOD;
  const [row] = await query<Row>(`SELECT * FROM crm_partner_payout_details WHERE partner_id = $1`, [partnerId]);
  return row ? summary(row) : null;
}

// Owner only: the full numbers, to send a payout.
export async function payoutFull(partnerId: string): Promise<PayoutFull | "not_configured" | null> {
  const [row] = await query<Row>(`SELECT * FROM crm_partner_payout_details WHERE partner_id = $1`, [partnerId]);
  if (!row) return null;
  const k = key();
  if (!k) return "not_configured";
  const { routing, account } = JSON.parse(decrypt(row.secret, k)) as { routing: string; account: string };
  return { ...summary(row), routingNumber: routing, accountNumber: account };
}
