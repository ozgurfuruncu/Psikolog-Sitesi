import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
afterEach(() => vi.unstubAllEnvs());
describe("Production HTTPS ingress", () => {
  function request(method = "GET", protocol = "http", host = "site.example.test") {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RENDER", "true");
    vi.stubEnv("APP_URL", "https://site.example.test");
    vi.stubEnv("ISOLATED_TEST_MODE", "");
    return new NextRequest("http://internal-host/panel", {
      method,
      headers: { host, "x-forwarded-proto": protocol },
    });
  }
  it("redirects insecure reads to the canonical HTTPS host", () => {
    const response = proxy(request());
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://site.example.test/panel");
  });
  it("rejects insecure mutations instead of forwarding credentials", () =>
    expect(proxy(request("POST")).status).toBe(400));
  it("accepts HTTPS ingress with the configured host", () =>
    expect(proxy(request("POST", "https")).headers.get("x-middleware-next")).toBe("1"));
  it("never trusts a different host header", () =>
    expect(proxy(request("POST", "https", "attacker.example.test")).status).toBe(400));
});
