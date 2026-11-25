import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.review", quiet: true });
const url = new URL(process.env.REVIEW_TEST_URL || "https://not-configured.example.test");
if (url.protocol !== "https:" || /^(localhost|127\.|192\.168\.|10\.|\[::1\])/.test(url.hostname))
  throw new Error("REVIEW_TEST_URL must be the actual public HTTPS origin.");
export default defineConfig({
  testDir: "./public-tests",
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  expect: { timeout: 20000 },
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/public-review.json" }]],
  use: {
    baseURL: url.origin,
    ignoreHTTPSErrors: false,
    // Never record authentication secrets, verification URLs or private inboxes.
    trace: "off",
    screenshot: "off",
    video: "off",
    extraHTTPHeaders: { origin: url.origin },
  },
  projects: [
    { name: "Android Chrome", use: { ...devices["Pixel 7"] } },
    { name: "iPhone Safari", use: { ...devices["iPhone 13"] } },
  ],
});
