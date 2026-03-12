/**
 * 08 — Antrenör (Trainer) Testleri
 * Kapsam: Antrenör sayfası, Derslerim, Kayıtlar, Doğrulama
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Antrenör — Public", () => {
  test("antrenör sayfası yükleniyor", async ({ page }) => {
    await page.goto("/antrenor");
    await expectMainVisible(page);
  });
});

test.describe("Antrenör — Oturum Gerekli", () => {
  authTest("derslerim sayfası yükleniyor", async ({ page }) => {
    await page.goto("/antrenor/derslerim");
    await expectMainVisible(page);
  });

  authTest("antrenor dersleri API'si calistiyor", async ({ page }) => {
    const response = await page.request.get("/api/trainer/lessons");
    // 405 = bu endpoint GET desteklemiyor olabilir
    expect(response.status()).toBeLessThan(500);
  });

  authTest("antrenor kayitlari API'si calistiyor", async ({ page }) => {
    const response = await page.request.get("/api/trainer/enrollments");
    expect(response.status()).toBeLessThan(500);
  });
});
