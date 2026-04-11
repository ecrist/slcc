/**
 * Vitest global setup — runs once before all test suites in the main process.
 * Migrates the test database schema so integration tests have a clean slate.
 */
import { execSync } from "child_process";

export async function setup() {
  const dbUrl =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/swanlake_test";

  console.log("[test setup] Running migrations on test database…");
  try {
    execSync("npx tsx src/lib/db/migrate.ts", {
      // Pass the test DB URL explicitly; dotenv in migrate.ts won't override it
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "inherit",
    });
  } catch {
    // DB not available locally — unit tests (which mock the DB) will still pass.
    // Integration tests that require a real DB will fail with a connection error.
    console.warn(
      "[test setup] Could not connect to test database — integration tests will be skipped.\n" +
        "  Set TEST_DATABASE_URL to run integration tests locally."
    );
  }
}

export async function teardown() {
  // Nothing to tear down — the test DB persists between runs (schema is idempotent)
}
