/**
 * Kimlik doğrulama gerektiren E2E testleri
 *
 * auth.setup.ts ile kaydedilen oturum kullanılır.
 * Bu testlerin çalışması için önce setup projesinin çalıştırılmış olması gerekir:
 *   npx playwright test --project=setup
 */
import { test, expect } from "@playwright/test";
import path from "path";

// Kaydedilmiş oturum durumunu kullan
test.use({ storageState: path.join(__dirname, ".auth/user.json") });

test.describe("İlan Oluşturma (oturum gerektirir)", () => {
  test("ilan oluşturma sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ilan/olustur");

    // Giriş sayfasına yönlendirme olmamalı
    await expect(page).not.toHaveURL(/\/auth\/giris/i);
    // Form öğeleri görünmeli
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Profil sayfası (oturum gerektirir)", () => {
  test("profil sayfası yükleniyor", async ({ page }) => {
    await page.goto("/profil");

    await expect(page).not.toHaveURL(/\/auth\/giris/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("ayarlar profil sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/profil");

    await expect(page).not.toHaveURL(/\/auth\/giris/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("bildirim ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/bildirimler");

    await expect(page).not.toHaveURL(/\/auth\/giris/i);
    // 'Push Bildirimleri' başlığı görünmeli
    await expect(page.getByText(/push bildirim/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Mesajlar (oturum gerektirir)", () => {
  test("mesajlar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/mesajlar");

    await expect(page).not.toHaveURL(/\/auth\/giris/i);
    await expect(page.locator("main")).toBeVisible();
  });
});
