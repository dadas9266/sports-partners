/**
 * auth.setup.ts — Test kullanıcısı ile giriş yapar ve oturum durumunu kaydeder.
 *
 * Çalıştırma: npx playwright test --project=setup
 *
 * Gerekli env değişkenleri (.env.test veya .env dosyasında):
 *   TEST_USER_EMAIL    — Mevcut bir test kullanıcısının e-posta adresi
 *   TEST_USER_PASSWORD — Test kullanıcısının şifresi
 */
import { test as setup, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

async function isAuthenticated(page: Page) {
  const profileButton = page.getByRole("button", { name: /profil/i }).first();
  const profileLink = page.locator('a[href="/profil"]').first();
  const createListingLink = page.locator('a[href="/ilan/olustur"]').first();
  return (await profileButton.isVisible().catch(() => false))
    || (await profileLink.isVisible().catch(() => false))
    || (await createListingLink.isVisible().catch(() => false));
}

setup("test kullanıcısı ile giriş yap", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL ?? "ahmet@test.com";
  const password = process.env.TEST_USER_PASSWORD ?? "Test123!";

  // Mevcut ve dolu storageState varsa yeniden üretmeye gerek yok
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      const state = JSON.parse(raw) as { cookies?: unknown[]; origins?: unknown[] };
      const hasState = (state.cookies?.length ?? 0) > 0 || (state.origins?.length ?? 0) > 0;
      if (hasState) {
        return;
      }
    } catch {
      // Corrupt state varsa normal login akışına düş
    }
  }

  await page.goto("/");
  if (await isAuthenticated(page)) {
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  await page.goto("/auth/giris");

  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Yönlendirme ya da auth UI göstergelerinden biri görülmeli
  await Promise.race([
    page.waitForURL(/\/(onboarding)?$/, { timeout: 20_000 }).catch(() => null),
    page.waitForURL(/\/(profil|sosyal|arama|teklifler|aktivitelerim)/, { timeout: 20_000 }).catch(() => null),
    page.waitForFunction(() => {
      const hasProfile = !!document.querySelector('button[aria-label*="Profil"], a[href="/profil"]');
      const hasCreateListing = !!document.querySelector('a[href="/ilan/olustur"]');
      return hasProfile || hasCreateListing;
    }, { timeout: 20_000 }).catch(() => null),
  ]);

  if (!(await isAuthenticated(page))) {
    throw new Error("Auth setup başarısız: giriş sonrası oturum göstergesi bulunamadı");
  }

  // Oturum durumunu kaydet
  await page.context().storageState({ path: AUTH_FILE });
});
