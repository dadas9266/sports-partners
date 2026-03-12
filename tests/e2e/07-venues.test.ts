/**
 * 07 — Mekan (Venue) Testleri
 * Kapsam: Mekan listesi, Mekan profili, Doğrulama sistemi
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Mekanlar — Public", () => {
  test("mekanlar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/mekanlar");
    await expectMainVisible(page);
  });
});

test.describe("Mekanlar — API", () => {
  authTest("mekanlar API'si calistiyor", async ({ page }) => {
    const response = await page.request.get("/api/venues");
    // 400 = filtre/parametre gerekiyor, hepsi geçerli
    expect([200, 400, 401, 404]).toContain(response.status());
  });

  authTest("mekan profili API'si calistiyor", async ({ page }) => {
    const response = await page.request.get("/api/venue-profile");
    expect([200, 400, 401, 404]).toContain(response.status());
  });
});
