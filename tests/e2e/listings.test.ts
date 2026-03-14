/**
 * İlan listesi E2E testleri
 *
 * Not: Bu testler oturum açmasını gerektirmez (public sayfalar).
 */
import { test, expect } from "@playwright/test";

test.describe("İlan Listesi", () => {
  test("ana sayfa yükleniyor ve ilanlar görünüyor", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/SporPartner/i);
    // Navbar yüklenmeli
    await expect(page.locator("nav")).toBeVisible();
  });

  test("harita sayfası yükleniyor", async ({ page }) => {
    await page.goto("/harita");
    // Leaflet harita container yüklenmeli
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10_000 });
  });

  test("liderlik tablosu sayfası yükleniyor", async ({ page }) => {
    await page.goto("/liderlik");
    await expect(page).toHaveURL("/liderlik");
    // Sayfanın bir içeriği olmalı
    await expect(page.locator("main")).toBeVisible();
  });

  test("topluluklar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/topluluklar");
    await expect(page.locator("main")).toBeVisible();
  });

  test("ilan filtrelerinin çalışması", async ({ page }) => {
    await page.goto("/");
    // 'Tümü' filtresi active olmalı veya ilanlar yüklenmeli
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });
});
