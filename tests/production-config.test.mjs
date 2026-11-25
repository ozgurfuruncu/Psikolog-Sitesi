import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { validateProduction } from "../scripts/production-config.mjs";
const valid = {
  APP_URL: "https://staging.example.test",
  BETTER_AUTH_URL: "https://staging.example.test",
  BETTER_AUTH_SECRET: "test-only-auth-secret-32-characters-long",
  JOB_SECRET: "test-only-job-secret-32-characters-long",
  SETUP_TOKEN: "test-only-setup-secret-32-characters-long",
  DATABASE_URL: "postgresql://app:test@cloud.example.test/app",
  DEMO_MODE: "false",
  PAYMENT_PROVIDER: "disabled",
  VIDEO_PROVIDER: "disabled",
  PRIVATE_STORAGE_PATH: resolve("test-persistent-volume"),
  PERSISTENT_STORAGE_CONFIRMED: "true",
  EMAIL_PROVIDER: "smtp",
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "465",
  SMTP_USER: "test",
  SMTP_PASSWORD: "test-only",
  EMAIL_FROM: "test@example.test",
};
test("accepts a fully configured restricted staging environment", () =>
  assert.deepEqual(validateProduction(valid), []));
test("rejects HTTP and local canonical origins", () => {
  for (const APP_URL of [
    "http://staging.example.test",
    "https://localhost:3000",
    "https://192.168.1.5",
    "https://10.0.0.1",
    "https://[::1]",
    "https://example.test/path",
  ])
    assert.ok(validateProduction({ ...valid, APP_URL }).length, APP_URL);
});
test("rejects callback URL drift", () =>
  assert.ok(
    validateProduction({ ...valid, BETTER_AUTH_URL: "https://wrong.example.test" }).length,
  ));
test("rejects demo providers and test database bypasses", () => {
  for (const overrides of [
    { DEMO_MODE: "true" },
    { PAYMENT_PROVIDER: "mock" },
    { VIDEO_PROVIDER: "mock" },
    { ISOLATED_TEST_MODE: "true" },
    { DEV_LAN_ORIGINS: "http://192.168.1.5:3000" },
    { DATABASE_URL: "postgresql://cloud.example.test/durak_e2e_abcdef012345" },
  ])
    assert.ok(validateProduction({ ...valid, ...overrides }).length);
});
test("rejects missing persistent disk confirmation", () =>
  assert.ok(validateProduction({ ...valid, PERSISTENT_STORAGE_CONFIRMED: "false" }).length));
test("rejects local cloud database fallback", () =>
  assert.ok(validateProduction({ ...valid, DATABASE_URL: "postgresql://localhost/app" }).length));
test("rejects preview email and plaintext SMTP ports", () => {
  assert.ok(validateProduction({ ...valid, EMAIL_PROVIDER: "preview" }).length);
  assert.ok(validateProduction({ ...valid, SMTP_PORT: "25" }).length);
});
test("rejects missing setup credentials", () =>
  assert.ok(validateProduction({ ...valid, SETUP_TOKEN: "" }).length));

const review = {
  ...valid,
  REVIEW_MODE: "true",
  DEMO_MODE: "true",
  PRODUCTION_LEGAL_APPROVED: "false",
  DATABASE_URL: "postgresql://review:fictional@cloud.example.test/durak_review_abcdef012345",
  PAYMENT_PROVIDER: "mock",
  VIDEO_PROVIDER: "mock",
  EMAIL_PROVIDER: "preview",
  FILE_STORAGE_PROVIDER: "database",
  PRIVATE_STORAGE_PATH: "",
  PERSISTENT_STORAGE_CONFIRMED: "false",
  MOCK_WEBHOOK_SECRET: "test-only-review-webhook-secret-32-characters",
  DEMO_CLIENT_PASSWORD: "test-only-review-client-password-32-characters",
  DEMO_ADMIN_PASSWORD: "test-only-review-admin-password-32-characters",
};
test("accepts free-host review with database uploads and simulated mail, payment and video", () =>
  assert.deepEqual(validateProduction(review), []));
test("rejects public review with production data, live providers, weak passwords or missing safeguards", () => {
  for (const overrides of [
    { DATABASE_URL: valid.DATABASE_URL },
    { DATABASE_URL: "not-a-url" },
    { DATABASE_URL: "postgresql://127.0.0.1/durak_review_abcdef012345" },
    { REVIEW_MODE: "false" },
    { PRODUCTION_LEGAL_APPROVED: "true" },
    { PAYMENT_PROVIDER: "iyzico" },
    { VIDEO_PROVIDER: "live" },
    { IYZICO_API_KEY: "merchant-key" },
    { EMAIL_PROVIDER: "smtp" },
    { FILE_STORAGE_PROVIDER: "disk" },
    { DEMO_ADMIN_PASSWORD: "short" },
    { DEMO_CLIENT_PASSWORD: "short" },
    { MOCK_WEBHOOK_SECRET: "" },
    { APP_URL: "http://example.test" },
    { ISOLATED_TEST_MODE: "true" },
  ])
    assert.ok(
      validateProduction({ ...review, ...overrides }).length,
      JSON.stringify(Object.keys(overrides)),
    );
});
test("does not permit clinical deployment to reuse a review database", () =>
  assert.ok(validateProduction({ ...valid, DATABASE_URL: review.DATABASE_URL }).length));
test("reports malformed database URLs without crashing", () =>
  assert.ok(validateProduction({ ...valid, DATABASE_URL: "malformed" }).length));
