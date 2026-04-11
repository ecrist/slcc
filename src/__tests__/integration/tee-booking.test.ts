/**
 * Integration test: Tee time double-booking prevention.
 *
 * Verifies the partial unique index on tee_times(date, time) WHERE status != 'cancelled'
 * prevents two active bookings for the same slot — the core concurrency guarantee.
 * Uses the real test database — never touches production data.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { pool } from "@/lib/db";
import { truncate, closePool } from "@/test/db-helpers";

const INSERT_BOOKING = `
  INSERT INTO tee_times
    (date, time, players, player_name, player_email, holes, cart, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id
`;

beforeEach(async () => {
  await truncate("tee_times");
});

afterAll(async () => {
  await closePool();
});

describe("Tee time double-booking prevention", () => {
  it("allows a single booking for a slot", async () => {
    await expect(
      pool.query(INSERT_BOOKING, [
        "2099-07-15", "09:00", 2, "Test Golfer", "test@example.com", 18, 0, "confirmed",
      ])
    ).resolves.not.toThrow();
  });

  it("rejects a second confirmed booking for the same date+time", async () => {
    await pool.query(INSERT_BOOKING, [
      "2099-07-15", "09:00", 2, "First Golfer", "first@example.com", 18, 0, "confirmed",
    ]);

    await expect(
      pool.query(INSERT_BOOKING, [
        "2099-07-15", "09:00", 1, "Second Golfer", "second@example.com", 18, 0, "confirmed",
      ])
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("allows a booking on the same slot after the original is cancelled", async () => {
    const { rows } = await pool.query(INSERT_BOOKING, [
      "2099-07-15", "10:00", 2, "Canceller", "cancel@example.com", 18, 0, "confirmed",
    ]);
    const id = rows[0].id;

    await pool.query("UPDATE tee_times SET status = 'cancelled' WHERE id = $1", [id]);

    // Slot should now be available again (partial index excludes cancelled rows)
    await expect(
      pool.query(INSERT_BOOKING, [
        "2099-07-15", "10:00", 2, "New Golfer", "new@example.com", 18, 0, "confirmed",
      ])
    ).resolves.not.toThrow();
  });

  it("allows two bookings at different times on the same day", async () => {
    await pool.query(INSERT_BOOKING, [
      "2099-07-15", "09:00", 2, "Golfer A", "a@example.com", 18, 0, "confirmed",
    ]);
    await expect(
      pool.query(INSERT_BOOKING, [
        "2099-07-15", "09:12", 2, "Golfer B", "b@example.com", 18, 0, "confirmed",
      ])
    ).resolves.not.toThrow();
  });
});
