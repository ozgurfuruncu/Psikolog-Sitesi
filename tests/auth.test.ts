import { describe, it, expect, afterAll } from "vitest";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { randomUUID } from "node:crypto";
const email = `auth-${randomUUID()}@example.test`,
  password = "Test-only-password!123";
const origin = "http://localhost:3000";
async function call(path: string, body?: unknown, cookie?: string) {
  return auth.handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
function cookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
let sessionCookie = "";
describe.sequential("Authentication persisted in PostgreSQL", () => {
  it("rejects registration without adult confirmation", async () => {
    const r = await call("sign-up/email", {
      name: "Underage test",
      email: "underage@example.test",
      password,
      adultConfirmed: false,
    });
    expect(r.ok).toBe(false);
    expect(await db.user.count({ where: { email: "underage@example.test" } })).toBe(0);
  });
  it("registers a client and records consent without accepting an admin role", async () => {
    const r = await call("sign-up/email", {
      name: "Auth test",
      email,
      password,
      adultConfirmed: true,
      role: "ADMIN",
    });
    expect(r.ok).toBe(true);
    const u = await db.user.findUniqueOrThrow({
      where: { email },
      include: { accounts: true, consents: true },
    });
    expect(u.role).toBe("CLIENT");
    expect(u.emailVerified).toBe(false);
    expect(u.accounts[0].password).not.toContain(password);
    expect(u.consents).toHaveLength(3);
  });
  it("requires email verification before login", async () => {
    const r = await call("sign-in/email", { email, password });
    expect(r.status).toBe(403);
  });
  it("verifies an emailed token", async () => {
    const mail = await db.emailDelivery.findFirstOrThrow({
      where: { recipient: email, subject: "E-posta adresinizi doğrulayın" },
      orderBy: { createdAt: "desc" },
    });
    const url = mail.text.match(/https?:\/\/\S+/)![0];
    const r = await auth.handler(new Request(url));
    expect(r.status).toBeLessThan(400);
    expect((await db.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);
  });
  it("logs in with a server-side session and rejects a wrong password", async () => {
    expect((await call("sign-in/email", { email, password: "wrong-password" })).ok).toBe(false);
    const r = await call("sign-in/email", { email, password });
    expect(r.ok).toBe(true);
    sessionCookie = cookie(r);
    const session = await call("get-session", undefined, sessionCookie);
    expect((await session.json()).user.email).toBe(email);
  });
  it("logs out and revokes the persisted session", async () => {
    const r = await call("sign-out", {}, sessionCookie);
    expect(r.ok).toBe(true);
    expect(await (await call("get-session", undefined, sessionCookie)).json()).toBeNull();
  });
  it("resets the password with a one-time token and rejects reuse", async () => {
    const old = await call("sign-in/email", { email, password });
    const oldCookie = cookie(old);
    const r = await call("request-password-reset", { email, redirectTo: `${origin}/sifre-yenile` });
    expect(r.ok).toBe(true);
    const mail = await db.emailDelivery.findFirstOrThrow({
      where: { recipient: email, subject: "Hesabınıza ilişkin bir işlem" },
      orderBy: { createdAt: "desc" },
    });
    const url = new URL(mail.text.match(/https?:\/\/\S+/)![0]);
    const token = url.pathname.split("/").pop()!;
    const newPassword = "Changed-test-password!123";
    expect((await call("reset-password", { token, newPassword })).ok).toBe(true);
    expect((await call("reset-password", { token, newPassword })).ok).toBe(false);
    expect(await (await call("get-session", undefined, oldCookie)).json()).toBeNull();
    expect((await call("sign-in/email", { email, password: newPassword })).ok).toBe(true);
  });
});
afterAll(() => db.$disconnect());
