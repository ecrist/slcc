import { defineConfig } from "vitest/config";
import path from "path";

const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/swanlake_test";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "src/test/global-setup.ts",
    // Point the db module at the test database for all test workers
    env: {
      DATABASE_URL: testDbUrl,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
