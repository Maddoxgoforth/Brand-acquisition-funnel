import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { query } from "./db";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export type UserStatus = "pending" | "active" | "disabled";

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  status: UserStatus;
  created_at: string | Date;
  last_login_at: string | Date | null;
};

const MAX_PENDING = 25;
export const MIN_PASSWORD_LENGTH = 8;

function toMember(row: UserRow): TeamMember {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    lastLoginAt: row.last_login_at
      ? new Date(row.last_login_at).toISOString()
      : null,
  };
}

// Passwords are stored as a salted scrypt hash, never as the password.
async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type SignupResult = "created" | "exists" | "invalid" | "full";

// New accounts start as "pending": they can't sign in until the owner
// approves them on the Team screen.
export async function createAccount(
  name: string,
  email: string,
  password: string
): Promise<SignupResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().slice(0, 100);
  if (
    !cleanName ||
    !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
    cleanEmail.length > 200 ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > 200
  ) {
    return "invalid";
  }

  const [{ pending }] = await query<{ pending: number }>(
    `SELECT count(*)::int AS pending FROM crm_users WHERE status = 'pending'`
  );
  if (pending >= MAX_PENDING) return "full";

  const rows = await query(
    `INSERT INTO crm_users (email, name, password_hash)
     VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [cleanEmail, cleanName, await hashPassword(password)]
  );
  return rows.length > 0 ? "created" : "exists";
}

export type LoginResult =
  | { ok: true; id: string }
  | { ok: false; reason: "wrong" | "pending" | "disabled" };

export async function checkLogin(
  email: string,
  password: string
): Promise<LoginResult> {
  const rows = await query<UserRow>(`SELECT * FROM crm_users WHERE email = $1`, [
    email.trim().toLowerCase(),
  ]);
  const user = rows[0];
  if (!user || !(await passwordMatches(password, user.password_hash))) {
    return { ok: false, reason: "wrong" };
  }
  if (user.status !== "active") return { ok: false, reason: user.status };

  await query(`UPDATE crm_users SET last_login_at = now() WHERE id = $1`, [
    user.id,
  ]);
  return { ok: true, id: user.id };
}

// Used on every signed-in request, so removing access takes effect at once.
export async function getActiveMember(id: string): Promise<TeamMember | null> {
  const rows = await query<UserRow>(
    `SELECT * FROM crm_users WHERE id = $1 AND status = 'active'`,
    [id]
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function listTeam(): Promise<TeamMember[]> {
  const rows = await query<UserRow>(
    `SELECT * FROM crm_users ORDER BY (status = 'pending') DESC, created_at DESC`
  );
  return rows.map(toMember);
}

export async function setMemberStatus(
  id: string,
  status: "active" | "disabled"
): Promise<TeamMember | null> {
  const rows = await query<UserRow>(
    `UPDATE crm_users SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function deleteMember(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM crm_users WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return rows.length > 0;
}
