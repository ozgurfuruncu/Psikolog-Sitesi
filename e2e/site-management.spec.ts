import { test, expect } from "@playwright/test";
import { db } from "../src/lib/db";
import { verifyRestartedContent } from "./restarted-server";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6xkAAAAASUVORK5CYII=",
  "base64",
);

test("Site Yönetimi persists profile, branding, education, certificates and publication choices", async ({
  page,
  browser,
}) => {
  await db.rateLimit.deleteMany();
  const oldSite = await db.siteSettings.findUniqueOrThrow({ where: { id: "primary" } });
  const oldProfile = await db.psychologistProfile.findUniqueOrThrow({ where: { id: "primary" } });
  let educationId: string | undefined, certificateId: string | undefined;
  try {
    await page.goto("/giris");
    await page.getByLabel("E-posta adresiniz", { exact: true }).fill("uzman@example.test");
    await page.getByLabel("Şifreniz", { exact: true }).fill(process.env.DEMO_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page).toHaveURL(/\/yonetim$/);
    await page.getByRole("link", { name: "Site Yönetimi", exact: true }).click();
    const general = page.locator("#genel");
    await general.getByLabel("Site Adı", { exact: true }).fill("E2E Site Adı");
    await general.getByLabel("Tarayıcı başlığı", { exact: true }).fill("E2E Tarayıcı Başlığı");
    await general
      .getByLabel("Ana sayfa başlığı", { exact: true })
      .fill("E2E Kaydedilen Ana Başlık");
    await general.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
    await expect(page.getByText("Değişiklikler kaydedildi.", { exact: true })).toBeVisible();
    const profile = page.locator("#profil");
    await profile.getByLabel("İsim", { exact: true }).fill("E2E İsim");
    await profile.getByLabel("Soyisim", { exact: true }).fill("Soyisim");
    await profile
      .getByLabel("Biyografi", { exact: true })
      .fill("E2E kalıcı biyografi, yalnızca otomatik test verisidir.");
    await profile.getByLabel("İletişim e-postası", { exact: true }).fill("contact@example.test");
    await profile.getByLabel("Adres", { exact: true }).fill("E2E Adres");
    await profile
      .getByLabel("Instagram Bağlantısı", { exact: true })
      .fill("https://example.test/instagram");
    await profile.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
    await expect
      .poll(
        async () =>
          (await db.psychologistProfile.findUniqueOrThrow({ where: { id: "primary" } })).name,
      )
      .toBe("E2E İsim Soyisim");
    await page
      .locator("#profile-photo")
      .setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Fotoğrafı yükle", exact: true }).click();
    await expect(page.getByText("Profil fotoğrafı güncellendi.", { exact: true })).toBeVisible();
    await page
      .locator("#logoFileId")
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await page
      .locator("form")
      .filter({ has: page.locator("#logoFileId") })
      .getByRole("button", { name: "Görseli yükle" })
      .click();
    await expect
      .poll(
        async () =>
          (await db.siteSettings.findUniqueOrThrow({ where: { id: "primary" } })).logoFileId,
      )
      .toBeTruthy();
    await page
      .locator("#faviconFileId")
      .setInputFiles({ name: "favicon.png", mimeType: "image/png", buffer: png });
    await page
      .locator("form")
      .filter({ has: page.locator("#faviconFileId") })
      .getByRole("button", { name: "Görseli yükle" })
      .click();
    await expect
      .poll(
        async () =>
          (await db.siteSettings.findUniqueOrThrow({ where: { id: "primary" } })).faviconFileId,
      )
      .toBeTruthy();
    await page.locator("#egitim").getByRole("button", { name: "Yeni ekle" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Kurum", { exact: true }).fill("E2E Üniversite Adı");
    await dialog.getByLabel("Eğitim / program adı", { exact: true }).fill("E2E Eğitim Bilgileri");
    await dialog.getByLabel("Bölüm Adı", { exact: true }).fill("E2E Bölüm Adı");
    await dialog.getByLabel("Derece", { exact: true }).fill("E2E Derece");
    await dialog.getByLabel("Yayımla", { exact: true }).check();
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    educationId = (
      await db.education.findFirstOrThrow({ where: { qualification: "E2E Eğitim Bilgileri" } })
    ).id;
    await page.locator("#sertifikalar").getByRole("button", { name: "Yeni ekle" }).click();
    await dialog.getByLabel("Belge adı", { exact: true }).fill("E2E Sertifika Adı");
    await dialog.getByLabel("Veren kurum", { exact: true }).fill("E2E Kurum Adı");
    await dialog
      .getByLabel("Belge dosyası", { exact: true })
      .setInputFiles({ name: "certificate.png", mimeType: "image/png", buffer: png });
    await expect(dialog.getByText("Belge dosyası kayda bağlandı.")).toBeVisible();
    await dialog.getByLabel("Kişisel bilgileri maskeledim ve yayın iznini kontrol ettim").check();
    await dialog.getByLabel("Yayımla", { exact: true }).check();
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    certificateId = (
      await db.certificate.findFirstOrThrow({ where: { title: "E2E Sertifika Adı" } })
    ).id;
    await page.screenshot({ path: "docs/screenshots/site-management-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "docs/screenshots/site-management-mobile.png", fullPage: true });
    const context = await browser.newContext();
    const publicPage = await context.newPage();
    await publicPage.goto("https://localhost:3100/");
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Kaydedilen Ana Başlık",
    );
    await expect(publicPage).toHaveTitle("E2E Tarayıcı Başlığı");
    await publicPage.goto("https://localhost:3100/hakkinda");
    await expect(
      publicPage.getByText("E2E kalıcı biyografi, yalnızca otomatik test verisidir."),
    ).toBeVisible();
    const image = publicPage.getByRole("img", { name: "Uzman profil fotoğrafı" });
    await expect(image).toBeVisible();
    expect((await publicPage.request.get((await image.getAttribute("src"))!)).ok()).toBeTruthy();
    await publicPage.goto("https://localhost:3100/egitim");
    await expect(publicPage.getByText("E2E Bölüm Adı")).toBeVisible();
    await publicPage.goto("https://localhost:3100/sertifikalar");
    await expect(publicPage.getByText("E2E Sertifika Adı", { exact: true })).toBeVisible();
    await publicPage.goto("https://localhost:3100/iletisim");
    await expect(publicPage.getByRole("link", { name: "contact@example.test" })).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute(
      "href",
      "https://example.test/instagram",
    );
    await verifyRestartedContent();
    expect(await publicPage.locator('a[href="mailto:"]').count()).toBe(0);
    await page.goto("/yonetim/site-yonetimi");
    await page.locator("#genel").getByLabel("Profili yayımla", { exact: true }).uncheck();
    await page.locator("#genel").getByRole("button", { name: "Değişiklikleri kaydet" }).click();
    await expect
      .poll(
        async () =>
          (await db.siteSettings.findUniqueOrThrow({ where: { id: "primary" } })).showProfile,
      )
      .toBe(false);
    await publicPage.goto("https://localhost:3100/");
    await expect(
      publicPage.getByText("E2E kalıcı biyografi, yalnızca otomatik test verisidir."),
    ).toHaveCount(0);
    await expect(publicPage.getByRole("link", { name: "Uzman hakkında", exact: true })).toHaveCount(
      0,
    );
    await context.close();
  } finally {
    if (educationId) await db.education.delete({ where: { id: educationId } });
    if (certificateId) await db.certificate.delete({ where: { id: certificateId } });
    await db.psychologistProfile.update({ where: { id: "primary" }, data: oldProfile });
    await db.siteSettings.update({ where: { id: "primary" }, data: oldSite });
  }
});
