/**
 * 18 — Arama & Öneri Testleri
 * Kapsam: Arama sayfası, Arama API, Öneri sistemi
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Arama — Public", () => {
  test("arama sayfası yükleniyor", async ({ page }) => {
    await page.goto("/arama");
    await expectMainVisible(page);
  });
});

test.describe("Arama — API", () => {
  authTest("arama API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/search?q=futbol");
    expect([200, 401]).toContain(response.status());
  });

  authTest("öneri API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/recommendations");
    expect([200, 401]).toContain(response.status());
  });

  authTest("spor listesi API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/sports");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.sports || data.data).toBeTruthy();
  });

  authTest("konum API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/locations");
    expect([200, 401]).toContain(response.status());
  });
});
