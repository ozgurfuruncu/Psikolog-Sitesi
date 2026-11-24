import { defineConfig } from "@playwright/test";
import "dotenv/config";
import { randomBytes } from "node:crypto";
const databaseUrl = new URL(process.env.DATABASE_URL!);
if (!/^\/durak_e2e_[a-f0-9]{12}$/.test(databaseUrl.pathname))
  databaseUrl.pathname = `/durak_e2e_${randomBytes(6).toString("hex")}`;
process.env.DATABASE_URL = databaseUrl.toString();
process.env.APP_URL = "http://localhost:3100";
process.env.BETTER_AUTH_URL = "http://localhost:3100";
// These credentials belong only to the disposable E2E database, never the local demo accounts.
process.env.DEMO_CLIENT_PASSWORD = "E2E-only-client-password!123";
process.env.DEMO_ADMIN_PASSWORD = "E2E-only-admin-password!123";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
    screenshot: "only-on-failure",
    extraHTTPHeaders: { origin: "http://localhost:3100" },
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3100/giris",
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === "string"),
      ),
      DATABASE_URL: databaseUrl.toString(),
      APP_URL: "http://localhost:3100",
      BETTER_AUTH_URL: "http://localhost:3100",
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
      DEMO_MODE: "true",
      ISOLATED_TEST_MODE: "true",
    },
  },
});
