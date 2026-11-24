import { defineConfig } from "vitest/config";
import "dotenv/config";
import { randomBytes } from "node:crypto";
const databaseName = `durak_test_${randomBytes(6).toString("hex")}`;
const url = new URL(
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/durak",
);
url.pathname = `/${databaseName}`;
process.env.DATABASE_URL = url.toString();
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: url.toString(),
      NODE_ENV: "test",
      DEMO_MODE: "true",
      EMAIL_PROVIDER: "preview",
      PAYMENT_PROVIDER: "mock",
      VIDEO_PROVIDER: "mock",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
      APP_URL: "http://localhost:3000",
      BETTER_AUTH_URL: "http://localhost:3000",
      MOCK_WEBHOOK_SECRET: process.env.MOCK_WEBHOOK_SECRET!,
    },
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
