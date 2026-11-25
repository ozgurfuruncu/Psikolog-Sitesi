import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemo, isIsolatedTest, isReview, productionGate } from "../src/lib/env";
afterEach(() => vi.unstubAllEnvs());
describe("Development provider release gates", () => {
  it("never activates mocks on an ordinary production database", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("ISOLATED_TEST_MODE", "true");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/durak");
    vi.stubEnv("PRODUCTION_LEGAL_APPROVED", "false");
    expect(isDemo()).toBe(false);
    expect(isIsolatedTest()).toBe(false);
    expect(() => productionGate()).toThrow();
  });
  it("allows compiled E2E artifacts only with the explicit disposable database prefix", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("ISOLATED_TEST_MODE", "true");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/durak_e2e_abcdef012345");
    expect(isDemo()).toBe(true);
    expect(() => productionGate()).not.toThrow();
  });
  it("rejects an invalid or missing isolated database URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ISOLATED_TEST_MODE", "true");
    vi.stubEnv("DATABASE_URL", "invalid");
    expect(isIsolatedTest()).toBe(false);
    expect(isDemo()).toBe(false);
  });
});

describe("Isolated public review", () => {
  function review() {
    for (const [key, value] of Object.entries({
      NODE_ENV: "production",
      REVIEW_MODE: "true",
      DEMO_MODE: "true",
      PAYMENT_PROVIDER: "mock",
      VIDEO_PROVIDER: "mock",
      EMAIL_PROVIDER: "preview",
      FILE_STORAGE_PROVIDER: "database",
      PRODUCTION_LEGAL_APPROVED: "false",
      DATABASE_URL: "postgresql://cloud.example.test/durak_review_abcdef012345",
      ISOLATED_TEST_MODE: "",
      IYZICO_API_KEY: "",
      IYZICO_SECRET_KEY: "",
    }))
      vi.stubEnv(key, value);
  }
  it("allows simulated workflows only in the explicitly isolated review", () => {
    review();
    expect(isReview()).toBe(true);
    expect(isDemo()).toBe(true);
    expect(() => productionGate()).not.toThrow();
  });
  it("fails closed when a real database, provider or legal switch is introduced", () => {
    for (const [key, value] of Object.entries({
      DATABASE_URL: "postgresql://cloud.example.test/app",
      PAYMENT_PROVIDER: "iyzico",
      VIDEO_PROVIDER: "live",
      EMAIL_PROVIDER: "smtp",
      FILE_STORAGE_PROVIDER: "disk",
      PRODUCTION_LEGAL_APPROVED: "true",
      IYZICO_API_KEY: "merchant-key",
      ISOLATED_TEST_MODE: "true",
      REVIEW_MODE: "false",
    })) {
      review();
      vi.stubEnv(key, value);
      expect(isReview(), key).toBe(false);
      expect(isDemo(), key).toBe(false);
      if (key !== "PRODUCTION_LEGAL_APPROVED") expect(() => productionGate()).toThrow();
    }
  });
});
