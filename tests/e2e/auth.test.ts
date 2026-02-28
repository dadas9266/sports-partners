/**
 * Kimlik doğrulama E2E testleri
 */
import { test, expect } from "@playwright/test";

test.describe("Giriş / Çıkış akışı", () => {
  test("giriş sayfası yükleniyor", async ({ page }) => {
    await page.goto("/auth/giris");

    await expect(page).toHaveTitle(/SporPartner/i);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("hatalı şifre ile hata mesajı gösteriliyor", async ({ page }) => {
    await page.goto("/auth/giris");

    await page.fill("#email", "test@sporpartner.com");
    await page.fill("#password", "yanlis_sifre_12345");
    await page.click('button[type="submit"]');

    // Hata toast veya mesaj bekliyoruz
    await expect(
      page.getByText(/hatalı|geçersiz|başarısız|yanlış/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("kayıt sayfasına geçiş linki çalışıyor", async ({ page }) => {
    await page.goto("/auth/giris");

    await page.click("text=/kayıt ol/i");
    await expect(page).toHaveURL(/\/auth\/kayit/i);
  });

  test("oturum açmadan korumalı sayfaya gitmeye çalışınca yönlendirilir", async ({
    page,
  }) => {
    await page.goto("/ayarlar/profil");
    // Giriş sayfasına yönlendirme bekleniyor
    await expect(page).toHaveURL(/\/auth\/giris/i, { timeout: 8_000 });
  });
});
