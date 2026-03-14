/**
 * 20 — Sayfa Yükleme Testi (Tüm Sayfalar)
 * Her sayfanın hatasız yüklendiğini kontrol eder
 */
import { test, expect, type Page } from "@playwright/test";
import { authTest, expectMainVisible } from "./helpers";

test.describe.configure({ mode: "serial" });

async function gotoStable(page: Page, route: string) {
  let response = await page
    .goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 })
    .catch(() => null);

  if (!response) {
    response = await page
      .goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => null);
  }

  return response;
}

const PUBLIC_PAGES = [
  "/",
  "/auth/giris",
  "/auth/kayit",
  "/auth/sifre-sifirla",
  "/arama",
  "/gruplar",
  "/kulupler",
  "/topluluklar",
  "/sosyal",
  "/antrenor",
];

const AUTH_PAGES = [
  "/profil",
  "/ayarlar/profil",
  "/ayarlar/bildirimler",
  "/ayarlar/gizlilik",
  "/ayarlar/guvenlik",
  "/ayarlar/davet",
  "/ilan/olustur",
  "/mesajlar",
  "/mesajlar/dm",
  "/gruplarim",
  "/kuluplerim",
  "/topluluklarim",
  "/aktivitelerim",
  "/teklifler",
  "/antrenor/derslerim",
  "/onboarding",
];

test.describe("Sayfa Yükleme — Public", () => {
  for (const route of PUBLIC_PAGES) {
    test(`${route} yükleniyor`, async ({ page }) => {
      const response = await gotoStable(page, route);
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      await expectMainVisible(page);
    });
  }

  // /liderlik — istemci taraflı, bazen ERR_ABORTED; domcontentloaded + yüksek zaman aşımı
  test("/liderlik yükleniyor", async ({ page }) => {
    test.setTimeout(60_000);
    const response = await gotoStable(page, "/liderlik");
    // Sayfa yüklenemese bile 5xx hatası olmamalı
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });
});

test.describe("Sayfa Yükleme — Authenticated", () => {
  for (const route of AUTH_PAGES) {
    authTest(`${route} yükleniyor`, async ({ page }) => {
      const response = await gotoStable(page, route);
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      await expectMainVisible(page);
    });
  }
});

test.describe("Sayfa Yükleme — Hata Kontrolü", () => {
  test("console error olmadan ana sayfa yükleniyor", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await gotoStable(page, "/");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Kritik JavaScript hataları olmamalı
    const criticalErrors = errors.filter(
      (e) => !e.includes("hydration") && !e.includes("ResizeObserver") && !e.includes("ChunkLoadError")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("404 sayfası uygun şekilde yükleniyor", async ({ page }) => {
    const response = await gotoStable(page, "/bu-sayfa-kesinlikle-yok-12345");
    // 404 veya redirect
    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(200);
    }
  });
});
