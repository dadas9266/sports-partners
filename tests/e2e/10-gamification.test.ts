/**
 * 10 — Gamification Testleri (Streak, Level, Liderlik Tablosu)
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe("Gamification — Public", () => {
  test("liderlik tablosu sayfası yükleniyor", async ({ page }) => {
    let response = await page.goto("/liderlik", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => null);
    if (!response) {
      response = await page.goto("/liderlik", { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => null);
    }
    await expectMainVisible(page);
  });
});

test.describe("Gamification — API", () => {
  authTest("leaderboard API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/leaderboard");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeTruthy();
  });

  authTest("seri (streak) API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/streak");
    expect([200, 401]).toContain(response.status());
  });

  authTest("arkadaş liderlik tablosu API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/leaderboard/friends");
    expect([200, 401]).toContain(response.status());
  });

  authTest("aktivitelerim sayfası yükleniyor", async ({ page }) => {
    await page.goto("/aktivitelerim");
    await expectMainVisible(page);
  });

  authTest("aktivite API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/activities");
    expect([200, 401]).toContain(response.status());
  });
});
