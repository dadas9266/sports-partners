/**
 * 14 — Mesajlaşma Testleri
 * Kapsam: Mesajlar sayfası, DM sistemi, Maç mesajları
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Mesajlaşma — Oturum Gerekli", () => {
  authTest("mesajlar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/mesajlar");
    await expectMainVisible(page);
  });

  authTest("DM sayfası yükleniyor", async ({ page }) => {
    await page.goto("/mesajlar/dm");
    await expectMainVisible(page);
  });

  authTest("konuşmalar API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/conversations");
    expect([200, 401]).toContain(response.status());
  });
});
