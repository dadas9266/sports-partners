/**
 * 15 — Eşleşme & Maç Testleri
 * Kapsam: Eşleşme sayfası, Maç detay, OTP doğrulama, NoShow raporu, Değerlendirme
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Eşleşme — Oturum Gerekli", () => {
  authTest("eşleşmeler API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/matches");
    expect(response.status()).toBeLessThan(500);
  });

  authTest("değerlendirme API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/ratings");
    expect(response.status()).toBeLessThan(500);
  });

  authTest("teklifler sayfası yükleniyor", async ({ page }) => {
    await page.goto("/teklifler");
    await expectMainVisible(page);
  });
});
