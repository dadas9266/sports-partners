/**
 * 06 — Topluluk Testleri
 * Kapsam: Topluluk listesi, Topluluk detay, Üyelik, Topluluk gönderileri
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Topluluklar — Public", () => {
  test("topluluklar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/topluluklar");
    await expectMainVisible(page);
  });
});

test.describe("Topluluklar — Oturum Gerekli", () => {
  authTest("topluluklarım sayfası yükleniyor", async ({ page }) => {
    await page.goto("/topluluklarim");
    await expectMainVisible(page);
  });

  authTest("topluluklar API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/communities");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeTruthy();
  });
});
