/**
 * Helpers for integration tests that need a clean DB state.
 * Always cleans up only test data (never production data).
 */
import { pool } from "@/lib/db";

/** Truncate one or more tables and reset their sequences. */
export async function truncate(...tables: string[]) {
  if (tables.length === 0) return;
  // CASCADE handles FK dependencies automatically
  await pool.query(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
}

/** Close the shared connection pool — call in afterAll to let Vitest exit cleanly. */
export async function closePool() {
  await pool.end();
}
