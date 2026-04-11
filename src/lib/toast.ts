/**
 * Toast POS shared utilities — HMAC verification and member name matching.
 * Extracted here so they can be unit-tested independently of the Next.js route.
 */
import crypto from "crypto";
import { query } from "@/lib/db";

// ── HMAC verification ─────────────────────────────────────────────────────────

/**
 * Verifies a Toast webhook signature.
 * Header format: "t=<timestamp>,v1=<hmac_hex>"
 * Payload signed: "<timestamp>.<rawBody>"
 */
export function verifySignature(
  secret: string,
  rawBody: string,
  signatureHeader: string
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const received = parts["v1"];
  if (!timestamp || !received) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

// ── Member name match ─────────────────────────────────────────────────────────

/**
 * Finds an active membership by a Toast tab name using priority-ordered matching:
 * 1. Exact nickname match  (e.g. "Smitty" → nickname "Smitty")
 * 2. Exact full-name match (e.g. "John Smith")
 * 3. Nickname contains / is contained by the tab name
 * 4. Last name only / partial full-name match
 */
export async function findMembershipByName(
  name: string
): Promise<{ id: number; member_name: string } | null> {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const rows = await query<{
    id: number;
    first_name: string;
    last_name: string;
    nickname: string | null;
  }>(`SELECT id, first_name, last_name, nickname FROM memberships WHERE status = 'active'`);

  const nicknameExact = rows.find((r) => r.nickname?.toLowerCase() === normalized);
  if (nicknameExact)
    return { id: nicknameExact.id, member_name: `${nicknameExact.first_name} ${nicknameExact.last_name}` };

  const fullNameExact = rows.find(
    (r) => `${r.first_name} ${r.last_name}`.toLowerCase() === normalized
  );
  if (fullNameExact)
    return { id: fullNameExact.id, member_name: `${fullNameExact.first_name} ${fullNameExact.last_name}` };

  const nicknamePartial = rows.find(
    (r) =>
      r.nickname &&
      (normalized.includes(r.nickname.toLowerCase()) ||
        r.nickname.toLowerCase().includes(normalized))
  );
  if (nicknamePartial)
    return { id: nicknamePartial.id, member_name: `${nicknamePartial.first_name} ${nicknamePartial.last_name}` };

  const partial = rows.find(
    (r) =>
      r.last_name.toLowerCase() === normalized ||
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(normalized) ||
      normalized.includes(r.last_name.toLowerCase())
  );
  if (partial)
    return { id: partial.id, member_name: `${partial.first_name} ${partial.last_name}` };

  return null;
}
