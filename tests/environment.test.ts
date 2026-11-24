import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemo, isIsolatedTest, productionGate } from "../src/lib/env";
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
