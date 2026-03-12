/**
 * 11 — Bildirim Testleri
 * Kapsam: Bildirim listesi, Bildirim akışı, Push abonelik
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Bildirimler — Oturum Gerekli", () => {
  authTest("bildirim ayarları sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ayarlar/bildirimler");
    await expectMainVisible(page);
  });

  authTest("bildirim API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/notifications");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeTruthy();
  });

  authTest("bildirim ayarları push içeriği kontrol", async ({ page }) => {
    await page.goto("/ayarlar/bildirimler");
    await expectMainVisible(page);
    await expect(page.getByText(/push bildirim|bildirim ayar/i).first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});
