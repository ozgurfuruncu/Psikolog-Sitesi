import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page, admin = false, email?: string, password?: string) {
  await page.goto("/giris");
  await page
    .getByLabel("E-posta adresiniz", { exact: true })
    .fill(email || (admin ? "uzman@example.test" : "danisan@example.test"));
  await page
    .getByLabel("Şifreniz", { exact: true })
    .fill(password || process.env[admin ? "REVIEW_ADMIN_PASSWORD" : "REVIEW_CLIENT_PASSWORD"]!);
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/sign-in/email" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    const result = await response;
    if (result.status() !== 429) break;
    // Wait only after an actual 429; never clear or bypass the deployed rate limit.
    const seconds = Number(result.headers()["retry-after"] || "61");
    await new Promise(done => setTimeout(done, Math.min(65, Math.max(1, seconds)) * 1000));
  }
  await expect(page).toHaveURL(admin ? /\/yonetim$/ : /\/panel$/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.includes("session_token") && c.secure && c.httpOnly)).toBe(
    true,
  );
}
async function post(context: BrowserContext, path: string, data: unknown, status = 200) {
  const response = await context.request.post(path, { data });
  expect(response.status(), path).toBe(status);
  return response.json();
}
async function logout(page: Page) {
  const toggle = page.getByRole("button", { name: "Hesap menüsünü aç" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("button", { name: "Çıkış yap", exact: true }).click();
  await expect(page).toHaveURL(/\/giris$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
}

test("public HTTPS: mobile roles, registration, appointment, simulated payment/session, feedback and settings", async ({
  page,
  browser,
  baseURL,
}) => {
  for (const name of ["REVIEW_TEST_URL", "REVIEW_CLIENT_PASSWORD", "REVIEW_ADMIN_PASSWORD"])
    if (!process.env[name]) throw new Error(`${name} is required in the ignored .env.review file.`);
  const failures: string[] = [];
  const watch = (target: Page) => {
    target.on("pageerror", () => failures.push("browser runtime error"));
    target.on("response", (r) => {
      if (r.status() >= 500) failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    target.on("requestfailed", (r) => {
      if (!/cancel|abort|ERR_ABORTED/i.test(r.failure()?.errorText || ""))
        failures.push(`network ${new URL(r.url()).pathname}`);
    });
  };
  watch(page);
  const adminContext = await browser.newContext({
    ...test.info().project.use,
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  });
  const admin = await adminContext.newPage();
  watch(admin);
  let appointmentId: string | undefined;
  try {
    expect((await page.request.get("/api/health")).status()).toBe(200);
    const home = await page.goto("/");
    expect(home?.status()).toBe(200);
    expect(home?.headers()["x-robots-tag"]).toContain("noindex");
    const robots = await page.request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Disallow: /");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await page.getByRole("link", { name: "Uzman hakkında", exact: true }).first().click();
    await expect(page).toHaveURL(/\/hakkinda$/);
    for (const path of ["/", "/hakkinda", "/sertifikalar", "/kayit", "/giris"]) {
      expect((await page.goto(path))?.status()).toBe(200);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
    }
    await login(page);
    expect((await page.request.get("/api/admin/clients")).status()).toBe(403);
    expect((await page.request.get("/api/dev/mailbox")).status()).toBe(403);
    expect(
      (
        await page.request.post("/api/admin/review-session", {
          data: { appointmentId: "demo-live" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/profile", {
          headers: { origin: "https://untrusted.example.test" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    await logout(page);

    await login(admin, true);
    // Complete the seeded current-time fixture so the new test can open a room.
    const existing = await (await admin.request.get("/api/appointments/demo-live")).json();
    if (["CONFIRMED", "IN_PROGRESS"].includes(existing.status))
      await post(adminContext, "/api/appointments/demo-live", { action: "complete" });

    const email = `review-${randomUUID()}@example.test`,
      password = `Review-only!${randomUUID()}`;
    await page.goto("/kayit");
    await page.getByLabel("Adınız soyadınız").fill("İsim Soyisim Demo");
    await page.getByLabel("E-posta adresiniz", { exact: true }).fill(email);
    await page.getByLabel("Şifreniz", { exact: true }).fill(password);
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "Hesap oluştur", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("doğrulama");
    const inbox = await admin.request.get("/api/dev/mailbox");
    expect(inbox.status()).toBe(200);
    const mail = (await inbox.json()).find((m: { recipient: string }) => m.recipient === email);
    expect(!!mail).toBe(true);
    const verification = new URL(mail.text.match(/https?:\/\/\S+/)[0]);
    expect(verification.origin).toBe(baseURL);
    await page.goto(verification.toString());
    await login(page, false, email, password);
    await page.reload();
    await expect(page).toHaveURL(/\/panel$/);
    let date = "";
    for (let offset = 3; offset < 14; offset++) {
      const day = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
      const response = await page.request.get(`/api/availability?serviceId=individual&date=${day}`);
      expect(response.status()).toBe(200);
      if ((await response.json()).length) {
        date = day;
        break;
      }
    }
    expect(date).not.toBe("");
    await page.goto("/randevu?service=individual");
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByLabel("Başka bir tarih seçin").fill(date);
    await page
      .getByRole("button", { name: /^\d{2}:\d{2}$/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "Randevu talebini gönder" }).click();
    await expect(page.getByRole("heading", { name: "Talebiniz bize ulaştı." })).toBeVisible();
    const appointments = await (await page.request.get("/api/appointments")).json();
    const appointment = appointments.find(
      (a: { status: string }) => a.status === "PENDING_APPROVAL",
    );
    expect(!!appointment).toBe(true);
    appointmentId = appointment.id;
    await admin.goto(`/yonetim/randevular/${appointmentId}`);
    await admin.getByRole("button", { name: "Randevuyu onayla", exact: true }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Onayla", exact: true }).click();
    await expect(admin.getByText("Ödeme bekliyor", { exact: true }).first()).toBeVisible();
    await page.goto(`/panel/randevular/${appointmentId}`);
    await page.getByRole("link", { name: "Ödeme adımına geç" }).click();
    await page.getByRole("button", { name: "Ödeme yap", exact: true }).click();
    await page.getByRole("button", { name: "Test ödemesini tamamla" }).click();
    await expect(page.getByText("Ödendi", { exact: true }).first()).toBeVisible();
    expect((await page.request.get(`/api/appointments/${appointmentId}/ics`)).status()).toBe(200);
    await admin.goto(`/yonetim/randevular/${appointmentId}`);
    await admin.getByRole("button", { name: "Demo odasını şimdi hazırla" }).click();
    await expect(
      admin.getByText("Kurgusal görüşmenin saati şimdiye alındı. Demo odası hazır.", {
        exact: true,
      }),
    ).toBeVisible();
    for (const [target, root] of [
      [page, "/panel"],
      [admin, "/yonetim"],
    ] as const) {
      await target.goto(`${root}/gorusme/${appointmentId}`);
      await target.getByRole("button", { name: "Geliştirme odasına katıl", exact: true }).click();
      await expect(target.getByRole("button", { name: "Geliştirme odasındasınız" })).toBeVisible();
    }
    await admin.goto(`/yonetim/randevular/${appointmentId}`);
    await admin.getByRole("button", { name: "Görüşmeyi tamamla", exact: true }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Onayla", exact: true }).click();
    await expect(admin.getByText("Tamamlandı", { exact: true }).first()).toBeVisible();
    await page.goto(`/panel/degerlendirmeler?appointment=${appointmentId}`);
    for (const group of await page.getByRole("radiogroup").all())
      await group.getByRole("radio", { name: "5 / 5", exact: true }).click();
    const comment = `Kurgusal demo değerlendirmesi ${randomUUID()}`;
    await page.getByLabel("İyileştirebileceğimiz bir şey var mı?").fill(comment);
    await page.getByRole("button", { name: "Özel değerlendirmeyi gönder" }).click();
    await expect(page.getByText(comment)).toBeVisible();
    await admin.goto("/yonetim/degerlendirmeler");
    await expect(admin.getByText(comment)).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(comment)).toHaveCount(0);
    for (const path of ["/yonetim", "/yonetim/takvim", "/yonetim/site-yonetimi"]) {
      expect((await admin.goto(path))?.status()).toBe(200);
      expect(
        await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
    }
    // Save current settings unchanged so the public review's identity is preserved.
    await admin.locator("#genel").getByRole("button", { name: "Değişiklikleri kaydet" }).click();
    await expect(admin.getByText("Değişiklikler kaydedildi.", { exact: true })).toBeVisible();
    await page.goto("/panel");
    await logout(page);
    await logout(admin);
    expect(failures).toEqual([]);
  } finally {
    if (appointmentId) {
      const response = await adminContext.request.get(`/api/appointments/${appointmentId}`);
      if (
        response.ok() &&
        ["PENDING_APPROVAL", "AWAITING_PAYMENT", "CONFIRMED"].includes(
          (await response.json()).status,
        )
      )
        await adminContext.request.post(`/api/appointments/${appointmentId}`, {
          data: { action: "cancel" },
        });
    }
    await adminContext.close();
  }
});
