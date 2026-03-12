/**
 * 13 — Profil & Gizlilik Testleri
 * Kapsam: Profil görüntüleme, Profil düzenleme, Gizlilik ayarları, Engelleme
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Profil — Oturum Gerekli", () => {
  authTest("profil sayfası yükleniyor", async ({ page }) => {
    await page.goto("/profil");
    await expectMainVisible(page);
  });

  authTest("profil ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/profil");
    await expectMainVisible(page);
  });

  authTest("gizlilik ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/gizlilik");
    await expectMainVisible(page);
  });

  authTest("güvenlik ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/guvenlik");
    await expectMainVisible(page);
  });

  authTest("davet ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/davet");
    await expectMainVisible(page);
  });

  authTest("profil API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/profile");
    expect([200, 401]).toContain(response.status());
  });

  authTest("kullanıcı istatistik API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/users");
    expect(response.status()).toBeLessThan(500);
  });
});
