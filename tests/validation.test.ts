import { describe, it, expect } from "vitest";
import { bookingSchema, feedbackSchema, serviceSchema, supportSchema } from "../src/lib/validation";
import { inspectFile } from "../src/lib/files";
import { signaturesEqual, signPayload } from "../src/lib/providers/payment";
import { formatTime, istanbulDate, localDate } from "../src/lib/i18n";
describe("Server validation and safe files", () => {
  it("rejects booking without explicit consent", () => {
    expect(
      bookingSchema.safeParse({
        serviceId: "x",
        startsAt: new Date().toISOString(),
        consent: false,
        privacy: true,
      }).success,
    ).toBe(false);
  });
  it("rejects ratings outside 1-5", () => {
    expect(
      feedbackSchema.safeParse({ overall: 6, communication: 5, booking: 5, technical: 5 }).success,
    ).toBe(false);
  });
  it("rejects paid services without a positive price", () => {
    expect(
      serviceSchema.safeParse({
        name: "Test",
        description: "",
        durationMinutes: 50,
        priceKurus: 0,
        paymentRequired: true,
        active: true,
      }).success,
    ).toBe(false);
  });
  it("rejects a malformed support request", () => {
    expect(
      supportSchema.safeParse({ name: "a", email: "broken", subject: "x", message: "x" }).success,
    ).toBe(false);
  });
  it("rejects spoofed PNG and SVG uploads", () => {
    expect(() => inspectFile(Buffer.from("<svg onload='alert(1)'>"), "image/png")).toThrow();
    expect(() => inspectFile(Buffer.from("<svg xmlns='x'></svg>"), "image/svg+xml")).toThrow();
  });
  it("rejects oversized uploads", () => {
    expect(() => inspectFile(new Uint8Array(5 * 1024 * 1024 + 1), "image/png")).toThrow();
  });
  it("rejects PDF JavaScript", () => {
    expect(() =>
      inspectFile(Buffer.from("%PDF-1.7 /JavaScript evil()"), "application/pdf"),
    ).toThrow();
  });
  it("accepts permitted PNG/PDF file signatures", () => {
    expect(() =>
      inspectFile(Buffer.from("89504e470d0a1a0a00000000", "hex"), "image/png"),
    ).not.toThrow();
    expect(() =>
      inspectFile(Buffer.from("%PDF-1.7 sample document"), "application/pdf"),
    ).not.toThrow();
  });
  it("uses constant-size signature checks and rejects malformed signatures", () => {
    const expected = signPayload("payload", "secret");
    expect(signaturesEqual(expected, expected)).toBe(true);
    expect(signaturesEqual("bad", expected)).toBe(false);
    expect(signaturesEqual(null, expected)).toBe(false);
    expect(signaturesEqual(signPayload("tampered", "secret"), expected)).toBe(false);
  });
  it("converts Istanbul slots to UTC without shifting the local date", () => {
    const d = istanbulDate("2026-12-01", 540);
    expect(d.toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(formatTime(d)).toBe("09:00");
    expect(localDate(d)).toBe("2026-12-01");
  });
});
