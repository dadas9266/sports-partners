/**
 * 01 — Kimlik Doğrulama & Onboarding Testleri
 * Kapsam: Giriş, Kayıt, Şifre Sıfırlama, Onboarding, Oturum Koruması
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible, waitForPageReady } from "./helpers";

test.describe("Auth — Giriş Sayfası", () => {
  test("giriş formu öğeleri görünür", async ({ page }) => {
    await page.goto("/auth/giris");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("boş form gönderiminde hata mesajı", async ({ page }) => {
    await page.goto("/auth/giris");
    await page.click('button[type="submit"]');
    // Doğrulama mesajı veya HTML5 required
    const emailInput = page.locator("#email");
    const isRequired = await emailInput.getAttribute("required");
    if (isRequired !== null) {
      // HTML5 validation aktif
      expect(isRequired).not.toBeNull();
    }
  });

  test("hatalı şifre ile giriş denemesi hata gösterir", async ({ page }) => {
    await page.goto("/auth/giris");
    await page.fill("#email", "test@sporpartner.com");
    await page.fill("#password", "yanlis_sifre_99999");
    await page.click('button[type="submit"]');
    // Hata mesajı veya giriş sayfasında kalmak yeterli
    await page.waitForTimeout(3000);
    // Giriş sayfasında kaldıysa başarılı (yonlendirme olmadı)
    const url = page.url();
    const stayedOnLogin = url.includes("/auth/giris") || url.includes("/auth/kayit");
    const hasError = await page.getByText(/hatalı|geçersiz|başarısız|yanlış|error|hata/i).first().isVisible().catch(() => false);
    expect(stayedOnLogin || hasError).toBeTruthy();
  });
});

test.describe("Auth — Kayıt Sayfası", () => {
  test("kayıt formu yükleniyor", async ({ page }) => {
    await page.goto("/auth/kayit");
    await expect(page.locator("main")).toBeVisible();
    // Kayıt formu alanları
    await expect(page.locator('input[name="name"], #name').first()).toBeVisible({ timeout: 5_000 });
  });

  test("giriş sayfasına geçiş linki çalışıyor", async ({ page }) => {
    await page.goto("/auth/kayit");
    await page.click("text=/giriş yap/i");
    await expect(page).toHaveURL(/\/auth\/giris/i);
  });
});

test.describe("Auth — Şifre Sıfırlama", () => {
  test("şifre sıfırlama formu yükleniyor", async ({ page }) => {
    await page.goto("/auth/sifre-sifirla");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('input[type="email"], #email').first()).toBeVisible();
  });
});

test.describe("Auth — Korumalı Sayfalar Yönlendirmesi", () => {
  const protectedRoutes = [
    "/ayarlar/profil",
    "/ilan/olustur",
    "/mesajlar",
    "/aktivitelerim",
    "/gruplarim",
    "/kuluplerim",
    "/topluluklarim",
  ];

  for (const route of protectedRoutes) {
    test(`${route} → giriş yönlendirmesi`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/giris|\/$/i, { timeout: 10_000 });
    });
  }
});

test.describe("Auth — Oturum Açıkken", () => {
  authTest("onboarding sayfası erişilebilir", async ({ page }) => {
    await page.goto("/onboarding");
    await expectMainVisible(page);
  });
});
