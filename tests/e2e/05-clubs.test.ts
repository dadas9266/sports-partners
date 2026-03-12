/**
 * 05 — Kulüp Testleri
 * Kapsam: Kulüp listesi, Kulüp detay, Kaptan onayı, Üyelik
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible, waitForPageReady } from "./helpers";

test.describe("Kulüpler — Public", () => {
  test("kulüpler sayfası yükleniyor", async ({ page }) => {
    await page.goto("/kulupler");
    await expectMainVisible(page);
  });
});

test.describe("Kulüpler — Oturum Gerekli", () => {
  authTest("kulüplerim sayfası yükleniyor", async ({ page }) => {
    await page.goto("/kuluplerim");
    await expectMainVisible(page);
  });

  authTest("kulüpler API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/clubs");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeTruthy();
  });
});
