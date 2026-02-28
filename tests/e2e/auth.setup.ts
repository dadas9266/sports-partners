/**
 * auth.setup.ts — Test kullanıcısı ile giriş yapar ve oturum durumunu kaydeder.
 *
 * Çalıştırma: npx playwright test --project=setup
 *
 * Gerekli env değişkenleri (.env.test veya .env dosyasında):
 *   TEST_USER_EMAIL    — Mevcut bir test kullanıcısının e-posta adresi
 *   TEST_USER_PASSWORD — Test kullanıcısının şifresi
 */
import { test as setup } from "@playwright/test";
import path from "path";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("test kullanıcısı ile giriş yap", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL ?? "test@sporpartner.com";
  const password = process.env.TEST_USER_PASSWORD ?? "testpassword123";

  await page.goto("/auth/giris");

  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Ana sayfaya yönlendirilmeyi bekle
  await page.waitForURL("/", { timeout: 10_000 });

  // Oturum durumunu kaydet
  await page.context().storageState({ path: AUTH_FILE });
});
