import { test, expect, chromium, firefox, webkit, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
const baseURL = "https://localhost:3100";
const variants = [
  { name: "Android Chrome emulation (Chromium)", engine: chromium, device: devices["Pixel 7"] },
  { name: "iPhone Safari emulation (WebKit)", engine: webkit, device: devices["iPhone 13"] },
  { name: "Desktop Firefox", engine: firefox, device: devices["Desktop Firefox"] },
  {
    name: "Desktop Chrome",
    engine: chromium,
    device: devices["Desktop Chrome"],
    channel: "chrome",
    available:
      process.platform === "win32" &&
      existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe"),
  },
  {
    name: "Desktop Edge",
    engine: chromium,
    device: devices["Desktop Edge"],
    channel: "msedge",
    available:
      process.platform === "win32" &&
      existsSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
  },
];
for (const variant of variants) {
  test(`authentication lifecycle: ${variant.name}`, async () => {
    test.skip(
      variant.available === false,
      "Branded desktop browser is not installed on this host.",
    );
    await db.rateLimit.deleteMany();
    const browser = await variant.engine.launch({ channel: variant.channel });
    const context = await browser.newContext({
      ...variant.device,
      baseURL,
      permissions: [],
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const email = `mobile-${randomUUID()}@example.test`,
      password = "Mobile-only-test!123";
    const runtimeErrors: string[] = [];
    const failedRequests: Array<{ path: string; error: string | undefined }> = [];
    page.on("requestfailed", (request) => failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    try {
      await page.goto("/panel");
      await expect(page).toHaveURL(/\/giris$/);
      await page.goto("/kayit");
      await page.locator('input[name="name"]').fill("İsim Soyisim Test");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="adult"]').check();
      await page.locator('input[name="terms"]').check();
      await page.getByRole("button", { name: "Hesap oluştur", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("doğrulama");
      const mail = await db.emailDelivery.findFirstOrThrow({
        where: { recipient: email },
        orderBy: { createdAt: "desc" },
      });
      await page.goto(mail.text.match(/https?:\/\/\S+/)![0]);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
      await expect(page).toHaveURL(/\/panel$/);
      await page.reload();
      await expect(page).toHaveURL(/\/panel$/);
      expect((await page.request.get("/api/me")).status()).toBe(200);
      await page.goto("/yonetim");
      await expect(page).toHaveURL(/\/panel$/);
      const csrf = await page.request.post("/api/appointments", {
        headers: { origin: "https://untrusted.example" },
        data: {},
      });
      expect(csrf.status()).toBe(403);
      if (variant.device.viewport.width < 1024)
        await page.getByRole("button", { name: "Hesap menüsünü aç" }).click();
      await page.getByRole("button", { name: "Çıkış yap", exact: true }).click();
      await expect(page).toHaveURL(/\/giris$/);
      expect((await page.request.get("/api/me")).status()).toBe(401);
      await page.goto("/sifremi-unuttum");
      await page.locator('input[name="email"]').fill(email);
      await page.getByRole("button", { name: "Yenileme bağlantısı gönder" }).click();
      await expect(page.getByRole("status")).toContainText("yenileme");
      const reset = await db.emailDelivery.findFirstOrThrow({
        where: { recipient: email, subject: "Hesabınıza ilişkin bir işlem" },
        orderBy: { createdAt: "desc" },
      });
      await page.goto(reset.text.match(/https?:\/\/\S+/)![0]);
      await page.locator('input[name="password"]').fill("Changed-mobile-test!123");
      await page.getByRole("button", { name: "Şifreyi güncelle" }).click();
      await expect(page.getByRole("status")).toContainText("güncellendi");
      await page.goto("/giris");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill("Changed-mobile-test!123");
      await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
      await expect(page).toHaveURL(/\/panel$/);
      await page.goto("/randevu");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(runtimeErrors, JSON.stringify(failedRequests)).toEqual([]);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`responsive public, auth, client and admin routes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/hakkinda",
      "/sertifikalar",
      "/iletisim",
      "/giris",
      "/kayit",
      "/randevu",
    ]) {
      expect((await page.goto(path))?.status()).toBe(200);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
    }
    for (const admin of [false, true]) {
      await db.rateLimit.deleteMany();
      await page.goto("/giris");
      await page
        .locator('input[name="email"]')
        .fill(admin ? "uzman@example.test" : "danisan@example.test");
      await page
        .locator('input[name="password"]')
        .fill(process.env[admin ? "DEMO_ADMIN_PASSWORD" : "DEMO_CLIENT_PASSWORD"]!);
      await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
      await expect(page).toHaveURL(admin ? /\/yonetim$/ : /\/panel$/);
      for (const path of admin
        ? ["/yonetim", "/yonetim/takvim", "/yonetim/site-yonetimi"]
        : ["/panel", "/panel/odemeler", "/panel/gorusme"]) {
        expect((await page.goto(path))?.status()).toBe(200);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          path + " " + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll("main *")).filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => ({ tag: element.tagName, class: element.className, right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })).slice(0, 12))),
        ).toBe(true);
      }
      await page.request.post("/api/auth/sign-out", { data: {} });
    }
  });
}
