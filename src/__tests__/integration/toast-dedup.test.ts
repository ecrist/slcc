/**
 * Integration test: Toast charge deduplication.
 *
 * Verifies that the UNIQUE constraint on member_charges.external_id
 * prevents duplicate charges when Toast retries webhook delivery.
 * Uses the real test database — never touches production data.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { pool } from "@/lib/db";
import { truncate, closePool } from "@/test/db-helpers";

const INSERT_CHARGE = `
  INSERT INTO member_charges
    (member_name, charge_type, description, amount, source, external_id, created_by)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
`;

beforeEach(async () => {
  await truncate("member_charges");
});

afterAll(async () => {
  await closePool();
});

describe("Toast charge deduplication", () => {
  it("inserts a new charge successfully", async () => {
    await expect(
      pool.query(INSERT_CHARGE, [
        "John Smith", "bar_tab", "Toast tab: 2x Beer", 14.0, "toast", "toast-abc123", "toast-webhook",
      ])
    ).resolves.not.toThrow();

    const { rows } = await pool.query(
      "SELECT * FROM member_charges WHERE external_id = $1",
      ["toast-abc123"]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(14.0);
  });

  it("rejects a duplicate external_id with a unique-violation error", async () => {
    // First delivery
    await pool.query(INSERT_CHARGE, [
      "John Smith", "bar_tab", "Toast tab: 2x Beer", 14.0, "toast", "toast-dupe-test", "toast-webhook",
    ]);

    // Toast retries — same external_id should be rejected
    await expect(
      pool.query(INSERT_CHARGE, [
        "John Smith", "bar_tab", "Toast tab: 2x Beer", 14.0, "toast", "toast-dupe-test", "toast-webhook",
      ])
    ).rejects.toMatchObject({ code: "23505" });

    // Only one row in the DB
    const { rows } = await pool.query(
      "SELECT * FROM member_charges WHERE external_id = $1",
      ["toast-dupe-test"]
    );
    expect(rows).toHaveLength(1);
  });

  it("allows two charges with different external_ids", async () => {
    await pool.query(INSERT_CHARGE, [
      "Jane Doe", "bar_tab", "Toast tab: 1x Wine", 9.0, "toast", "toast-guid-001", "toast-webhook",
    ]);
    await pool.query(INSERT_CHARGE, [
      "Jane Doe", "bar_tab", "Toast tab: 1x Beer", 7.0, "toast", "toast-guid-002", "toast-webhook",
    ]);

    const { rows } = await pool.query(
      "SELECT * FROM member_charges WHERE member_name = $1 ORDER BY id",
      ["Jane Doe"]
    );
    expect(rows).toHaveLength(2);
  });
});
