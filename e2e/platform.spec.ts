import { test, expect, type Page, type Browser } from "@playwright/test";
import { db } from "../src/lib/db";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { addDays, localDate } from "../src/lib/i18n";
const base = "http://localhost:3100";
const password = "Browser-only-test!123";
async function capture(page: Page, path: string) {
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => {})));
    await document.fonts.ready;
  });
  await page.screenshot({ path, fullPage: true });
}
async function login(page: Page, admin = false, email?: string) {
  await db.rateLimit.deleteMany();
  await page.goto("/giris");
  await page
    .getByLabel("E-posta adresiniz", { exact: true })
    .fill(email || (admin ? "uzman@example.test" : "danisan@example.test"));
  await page
    .getByLabel("Şifreniz", { exact: true })
    .fill(email ? password : process.env[admin ? "DEMO_ADMIN_PASSWORD" : "DEMO_CLIENT_PASSWORD"]!);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page).toHaveURL(admin ? /\/yonetim$/ : /\/panel$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
async function context(browser: Browser) {
  return browser.newContext({
    baseURL: base,
    extraHTTPHeaders: { origin: base },
    viewport: { width: 1440, height: 1000 },
  });
}
async function register(page: Page, email: string) {
  await page.goto("/kayit");
  await page.getByLabel("Adınız soyadınız").fill("E2E Test Danışanı");
  await page.getByLabel("E-posta adresiniz").fill(email);
  await page.getByLabel("Şifreniz", { exact: true }).fill(password);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Hesap oluştur", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("doğrulama");
  const mail = await db.emailDelivery.findFirstOrThrow({
    where: { recipient: email },
    orderBy: { createdAt: "desc" },
  });
  const url = mail.text.match(/https?:\/\/\S+/)![0];
  await page.goto(url);
  await expect(page).toHaveURL(/giris/);
}
async function available(page: Page, service = "individual", offset = 5) {
  for (let i = offset; i < offset + 7; i++) {
    const date = addDays(localDate(), i);
    const response = await page.request.get(`/api/availability?serviceId=${service}&date=${date}`);
    expect(response.ok()).toBeTruthy();
    const slots = (await response.json()) as Array<{ startsAt: string; endsAt: string }>;
    if (slots.length) return { date, slots };
  }
  throw new Error("No available fixture dates");
}

test("complete UI journey: register, verify, alternative, pay, room, feedback", async ({
  page,
  browser,
}) => {
  const email = `journey-${randomUUID()}@example.test`;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kendinize");
  await page.getByRole("link", { name: "Uzman hakkında", exact: true }).first().click();
  await expect(page.getByText("Doldurulmayı bekleyen profil")).toBeVisible();
  await page.goto("/sertifikalar");
  await page.getByRole("button", { name: "Belgeyi incele" }).click();
  await expect(page.getByRole("dialog")).toContainText("yetkinlik belgesi değildir");
  await page.keyboard.press("Escape");
  await register(page, email);
  await login(page, false, email);
  const initial = await available(page);
  await page.goto("/randevu?service=individual");
  await page.getByRole("button", { name: "Devam et" }).click();
  await page.getByLabel("Başka bir tarih seçin").fill(initial.date);
  await page
    .getByRole("button", { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Devam et" }).click();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Randevu talebini gönder" }).click();
  await expect(page.getByRole("heading", { name: "Talebiniz bize ulaştı." })).toBeVisible();
  const a = await db.appointment.findFirstOrThrow({
    where: { client: { email } },
    include: { payment: true },
  });
  expect(a.status).toBe("PENDING_APPROVAL");
  const adminContext = await context(browser),
    admin = await adminContext.newPage();
  await login(admin, true);
  await admin.goto(`/yonetim/randevular/${a.id}`);
  const alt = await available(admin, "individual", 9);
  await admin.getByRole("button", { name: "Alternatif saat öner" }).click();
  const local = new Date(new Date(alt.slots[0].startsAt).getTime() + 3 * 3600_000)
    .toISOString()
    .slice(0, 16);
  await admin.getByLabel("Yeni tarih ve saat (İstanbul)").fill(local);
  await admin.getByRole("button", { name: "Onayla", exact: true }).click();
  await expect(admin.getByText("Yeni saat önerildi", { exact: true }).first()).toBeVisible();
  await page.goto(`/panel/randevular/${a.id}`);
  await page.getByRole("button", { name: "Önerilen saati kabul et" }).click();
  await page.getByRole("button", { name: "Onayla", exact: true }).click();
  await expect(page.getByText("Ödeme bekliyor", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Ödeme adımına geç" }).click();
  await page.getByRole("button", { name: "Ödeme yap", exact: true }).click();
  await page.getByRole("button", { name: "Başarısızlığı dene" }).click();
  await expect(page.getByText("Başarısız", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await page.getByRole("button", { name: "Test ödemesini tamamla" }).click();
  await expect(page.getByText("Ödendi", { exact: true })).toBeVisible();
  expect((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe(
    "CONFIRMED",
  );
  const ics = await page.request.get(`/api/appointments/${a.id}/ics`);
  expect(ics.ok()).toBeTruthy();
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  // Shift only this isolated test fixture to the current time to exercise the real server access window.
  await db.appointment.update({
    where: { id: a.id },
    data: {
      startsAt: new Date(Date.now() - 2 * 60_000),
      endsAt: new Date(Date.now() + 48 * 60_000),
      reservedUntil: new Date(Date.now() + 58 * 60_000),
    },
  });
  await page.goto(`/panel/gorusme/${a.id}`);
  await page.getByRole("button", { name: "Cihazlarımı test et" }).click();
  await expect
    .poll(() => page.locator("video").evaluate((v) => (v as HTMLVideoElement).srcObject !== null))
    .toBe(true);
  await page.getByRole("button", { name: "Mikrofonu kapat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mikrofonu aç", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kamerayı kapat", exact: true }).click();
  await expect(page.getByText("Kameranız kapalı", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geliştirme odasına katıl", exact: true }).click();
  await expect(page.getByRole("button", { name: "Geliştirme odasındasınız" })).toBeVisible();
  await admin.goto(`/yonetim/gorusme/${a.id}`);
  await admin.getByRole("button", { name: "Geliştirme odasına katıl", exact: true }).click();
  await expect(admin.getByRole("button", { name: "Geliştirme odasındasınız" })).toBeVisible();
  await capture(page, "docs/screenshots/session-desktop.png");
  await admin.goto(`/yonetim/randevular/${a.id}`);
  await admin.getByRole("button", { name: "Görüşmeyi tamamla", exact: true }).click();
  await admin.getByRole("button", { name: "Onayla", exact: true }).click();
  await expect(admin.getByText("Tamamlandı", { exact: true }).first()).toBeVisible();
  await page.goto(`/panel/degerlendirmeler?appointment=${a.id}`);
  await expect(page.getByRole("radiogroup")).toHaveCount(4);
  for (const group of await page.getByRole("radiogroup").all())
    await group.getByRole("radio", { name: "5 / 5", exact: true }).click();
  await page
    .getByLabel("İyileştirebileceğimiz bir şey var mı?")
    .fill("E2E özel test değerlendirmesi, gerçek danışan yorumu değildir.");
  await page.getByRole("button", { name: "Özel değerlendirmeyi gönder" }).click();
  await expect(
    page.getByText("E2E özel test değerlendirmesi, gerçek danışan yorumu değildir."),
  ).toBeVisible();
  await admin.goto("/yonetim/degerlendirmeler");
  await expect(
    admin.getByText("E2E özel test değerlendirmesi, gerçek danışan yorumu değildir."),
  ).toBeVisible();
  expect(await db.feedback.count({ where: { appointmentId: a.id } })).toBe(1);
  await page.goto("/");
  await expect(
    page.getByText("E2E özel test değerlendirmesi, gerçek danışan yorumu değildir."),
  ).toHaveCount(0);
  await adminContext.close();
});

test("authorization, IDOR, CSRF, invalid webhooks and role injection", async ({ page }) => {
  expect((await page.request.get("/api/appointments/demo-upcoming")).status()).toBe(401);
  await page.goto("/panel");
  await expect(page).toHaveURL(/giris/);
  await login(page);
  expect((await page.request.get("/api/admin/clients")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/appointments/demo-pending", { data: { action: "approve" } })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/profile", {
        headers: { origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const email = `idor-${randomUUID()}@example.test`;
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
  await register(page, email);
  await login(page, false, email);
  expect((await page.request.get("/api/appointments/demo-upcoming")).status()).toBe(404);
  expect(
    (await page.request.post("/api/appointments/demo-upcoming/video", { data: {} })).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post("/api/appointments/demo-completed/feedback", {
        data: { overall: 5, communication: 5, booking: 5, technical: 5 },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post("/api/payments/mock-webhook", {
        headers: { "x-mock-signature": "bad" },
        data: {},
      })
    ).status(),
  ).toBe(401);
  const denied = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Role injection",
      email: `role-${randomUUID()}@example.test`,
      password,
      adultConfirmed: false,
      termsAccepted: true,
      role: "ADMIN",
    },
  });
  expect(denied.status()).toBe(422);
});

test("certificate validation, redaction gate and private file authorization", async ({ page }) => {
  await login(page, true);
  const spoof = await page.request.post("/api/files", {
    multipart: {
      file: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("<svg onload=alert(1)>evil</svg>"),
      },
    },
  });
  expect(spoof.status()).toBe(400);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  );
  const response = await page.request.post("/api/files", {
    multipart: { file: { name: "test.png", mimeType: "image/png", buffer: png } },
  });
  expect(response.ok()).toBeTruthy();
  const file = await response.json();
  const data = {
    title: "E2E örnek belge",
    institution: "Test kurumu (kurgusal)",
    description: "Geliştirme örneği",
    fileId: file.id,
    verificationUrl: "",
    published: true,
    redactionConfirmed: false,
    isPlaceholder: true,
    order: 2,
  };
  expect((await page.request.post("/api/admin/certificates", { data })).status()).toBe(400);
  const published = await page.request.post("/api/admin/certificates", {
    data: { ...data, redactionConfirmed: true },
  });
  expect(published.ok()).toBeTruthy();
  const cert = await published.json();
  await page.goto("/sertifikalar");
  await expect(page.getByRole("heading", { name: "E2E örnek belge" })).toBeVisible();
  await page.getByRole("link", { name: "Danışan girişi", exact: true }).first().click();
  await page.goto("/yonetim");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
  expect((await page.request.get(`/api/files/${file.id}`)).status()).toBe(403);
  await login(page, true);
  expect(
    (await page.request.delete("/api/admin/certificates", { data: { id: cert.id } })).ok(),
  ).toBeTruthy();
});

test("account preferences, owned export, support and data-request persistence", async ({
  page,
}) => {
  await login(page);
  await page.goto("/panel/ayarlar");
  await page.getByLabel("Telefon (isteğe bağlı)").fill("5550000000");
  await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await expect(page.getByText("Bilgileriniz güncellendi.")).toBeVisible();
  const exported = await page.request.get("/api/data-export");
  expect(exported.ok()).toBeTruthy();
  const data = await exported.json();
  expect(data.email).toBe("danisan@example.test");
  expect(JSON.stringify(data)).not.toContain("uzman@example.test");
  await page.getByLabel("Açıklama (isteğe bağlı)").fill("E2E örnek erişim başvurusu");
  await page.getByRole("button", { name: "Başvuruyu ilet" }).click();
  await expect(page.getByText("Veri talebiniz kaydedildi.")).toBeVisible();
  await page.goto("/iletisim");
  await page.getByLabel("Adınız soyadınız").fill("E2E destek testi");
  await page.getByLabel("E-posta adresiniz").fill("support@example.test");
  await page.getByLabel("Konu", { exact: true }).fill("Teknik test talebi");
  await page.getByLabel("Mesajınız").fill("Geliştirme ortamı için teknik test mesajıdır.");
  await page.getByRole("button", { name: "Mesajı gönder" }).click();
  await expect(page.getByRole("status")).toContainText("Mesajınız alındı");
});

test("admin CRUD, calendar views and protected page smoke checks", async ({ page }) => {
  await login(page, true);
  for (const path of [
    "/yonetim/takvim",
    "/yonetim/randevular",
    "/yonetim/danisanlar",
    "/yonetim/danisanlar/demo-client",
    "/yonetim/odemeler",
    "/yonetim/degerlendirmeler",
    "/yonetim/profil",
    "/yonetim/icerik",
    "/yonetim/uygunluk",
    "/yonetim/destek",
    "/yonetim/ayarlar",
    "/yonetim/posta",
  ]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/yonetim/icerik");
  await page.getByRole("button", { name: "Yeni ekle", exact: true }).first().click();
  await page.getByLabel("Hizmet adı", { exact: true }).fill("E2E örnek hizmet");
  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Yalnızca otomatik tarayıcı testi için oluşturulan hizmet.");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "E2E örnek hizmet" })).toBeVisible();
  const service = await db.service.findFirstOrThrow({ where: { name: "E2E örnek hizmet" } });
  expect(service.durationMinutes).toBe(50);
  await page.getByRole("button", { name: "E2E örnek hizmet kaydını kaldır" }).click();
  await page.getByRole("button", { name: "Kaldır", exact: true }).click();
  await expect
    .poll(async () => (await db.service.findUniqueOrThrow({ where: { id: service.id } })).active)
    .toBe(false);
  await page.goto("/yonetim/takvim");
  const contentResponse = await page.request.post("/api/admin/site-content", {
    data: {
      key: "home-note",
      title: "E2E yönetilebilir bilgi notu",
      body: "Kurgusal site içeriği testi.",
      published: true,
    },
  });
  expect(contentResponse.ok()).toBeTruthy();
  const content = await contentResponse.json();
  await page.goto("/");
  await expect(page.getByText("E2E yönetilebilir bilgi notu")).toBeVisible();
  expect(
    (await page.request.delete("/api/admin/site-content", { data: { id: content.id } })).ok(),
  ).toBeTruthy();
  await page.goto("/yonetim/takvim");
  await page.getByRole("button", { name: "Hafta", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Gün", exact: true }).click();
  await expect(page.locator(".calendar-grid")).toHaveCount(0);
  await page.getByRole("button", { name: "Ay", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(42);
});

test("desktop screenshots and public navigation without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/hakkinda",
    "/egitim",
    "/sertifikalar",
    "/hizmetler",
    "/online-gorusme",
    "/blog",
    "/blog/ilk-randevuya-hazirlik",
    "/sikca-sorulan-sorular",
    "/iletisim",
    "/gizlilik",
    "/kvkk",
    "/onam",
    "/kullanim-kosullari",
    "/iptal-iade",
    "/randevu",
  ]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      path,
    ).toBeTruthy();
  }
  await page.goto("/");
  await capture(page, "docs/screenshots/home-desktop.png");
  await page.goto("/randevu");
  await capture(page, "docs/screenshots/booking-desktop.png");
  await login(page);
  await capture(page, "docs/screenshots/client-desktop.png");
  await page.goto("/panel/randevular");
  await expect(page.getByRole("heading", { name: "Randevularım", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
  await login(page, true);
  await capture(page, "docs/screenshots/admin-desktop.png");
  await page.goto("/yonetim/takvim");
  await capture(page, "docs/screenshots/calendar-desktop.png");
  expect(errors).toEqual([]);
});

test("mobile layouts, keyboard menu, forms and screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menüyü aç" })).toBeVisible();
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await expect(
    page.getByRole("link", { name: "Uzman hakkında", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menüyü kapat", exact: true }).click();
  await capture(page, "docs/screenshots/home-mobile.png");
  for (const path of [
    "/hakkinda",
    "/sertifikalar",
    "/blog",
    "/iletisim",
    "/kayit",
    "/giris",
    "/randevu",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      path,
    ).toBeTruthy();
  }
  await capture(page, "docs/screenshots/booking-mobile.png");
  await login(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await capture(page, "docs/screenshots/client-mobile.png");
  await page.getByRole("button", { name: "Hesap menüsünü aç" }).click();
  await page.getByRole("link", { name: "Hesap ayarlarım", exact: true }).click();
  await expect(page).toHaveURL(/panel\/ayarlar/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test("sensitive forms stay safe before hydration and without JavaScript", async ({ browser }) => {
  const noJs = await browser.newContext({ baseURL: base, javaScriptEnabled: false });
  const page = await noJs.newPage();
  for (const path of ["/giris", "/kayit", "/sifremi-unuttum", "/sifre-yenile"]) {
    await page.goto(path);
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.getByRole("button").last()).toBeDisabled();
  }
  await noJs.close();
});

test("login requests are throttled in the persisted database", async ({ page }) => {
  await db.rateLimit.deleteMany();
  const responses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "absent@example.test", password: "Invalid-test-only-password" },
    });
    responses.push(r.status());
  }
  expect(responses.slice(0, 5).every((status) => status === 401)).toBeTruthy();
  expect(responses[5]).toBe(429);
});

test("automated WCAG checks for public, authentication and client pages", async ({ page }) => {
  for (const path of ["/", "/giris", "/randevu"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      path,
    ).toEqual([]);
  }
  await login(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});

test.afterAll(async () => {
  await db.$disconnect();
});
