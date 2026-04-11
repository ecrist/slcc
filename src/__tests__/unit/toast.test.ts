import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Mock the db module so these unit tests never touch a database
vi.mock("@/lib/db", () => ({
  pool: {},
  query: vi.fn(),
  execute: vi.fn(),
}));

import { verifySignature, findMembershipByName } from "@/lib/toast";
import { query } from "@/lib/db";

// ── verifySignature ───────────────────────────────────────────────────────────

describe("verifySignature", () => {
  function makeHeader(secret: string, body: string, timestamp = "1700000000") {
    const payload = `${timestamp}.${body}`;
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return `t=${timestamp},v1=${sig}`;
  }

  it("accepts a valid signature", () => {
    const body = '{"eventType":"CHECK_CLOSED"}';
    const header = makeHeader("mysecret", body);
    expect(verifySignature("mysecret", body, header)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = '{"eventType":"CHECK_CLOSED"}';
    const header = makeHeader("mysecret", body);
    expect(verifySignature("mysecret", body + "x", header)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = '{"eventType":"CHECK_CLOSED"}';
    const header = makeHeader("correct-secret", body);
    expect(verifySignature("wrong-secret", body, header)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifySignature("secret", "body", "")).toBe(false);
  });

  it("rejects a header missing v1", () => {
    expect(verifySignature("secret", "body", "t=1700000000")).toBe(false);
  });
});

// ── findMembershipByName ──────────────────────────────────────────────────────

const MEMBERS = [
  { id: 1, first_name: "John",  last_name: "Smith",   nickname: "Smitty" },
  { id: 2, first_name: "Jane",  last_name: "Doe",     nickname: null     },
  { id: 3, first_name: "Bob",   last_name: "Johnson", nickname: null     },
  { id: 4, first_name: "Alice", last_name: "Brown",   nickname: "Al"     },
];

describe("findMembershipByName", () => {
  beforeEach(() => {
    vi.mocked(query).mockResolvedValue(MEMBERS);
  });

  it("matches by exact nickname (case-insensitive)", async () => {
    const result = await findMembershipByName("smitty");
    expect(result?.id).toBe(1);
    expect(result?.member_name).toBe("John Smith");
  });

  it("matches by exact full name", async () => {
    const result = await findMembershipByName("Jane Doe");
    expect(result?.id).toBe(2);
  });

  it("matches by last name only", async () => {
    const result = await findMembershipByName("Johnson");
    expect(result?.id).toBe(3);
  });

  it("matches by partial nickname (nickname contained in tab name)", async () => {
    // Tab name "Al Smith" should match Alice Brown whose nickname is "Al"
    const result = await findMembershipByName("Al Smith");
    expect(result?.id).toBe(4);
  });

  it("prefers exact nickname over full-name match", async () => {
    // Exact nickname "Smitty" wins over any full-name or partial logic
    const result = await findMembershipByName("Smitty");
    expect(result?.id).toBe(1);
  });

  it("returns null for a completely unknown name", async () => {
    const result = await findMembershipByName("Completely Unknown Person XYZ");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await findMembershipByName("");
    expect(result).toBeNull();
  });
});
