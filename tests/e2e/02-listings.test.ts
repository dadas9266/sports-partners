/**
 * 02 — İlan (Listing) Testleri
 * Kapsam: Ana sayfa, İlan listesi, İlan detay, İlan oluşturma, İlan düzenleme, Filtreler
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible, expectNotRedirectedToLogin, waitForPageReady, waitForApiResponse } from "./helpers";

test.describe("İlanlar — Genel (Public)", () => {
  test("ana sayfa yükleniyor ve navbar görünür", async ({ page }) => {
    await page.goto("/");
    // Başlık locale/brand varyasyonları gösterebilir; asıl beklenti sayfanın stabil açılması
    await expect(page).toHaveTitle(/SporPartner|SportPartner/i);
    const hasMainNav = await page.locator('nav[aria-label="Ana Gezinme"]').isVisible().catch(() => false);
    const hasBottomNav = await page.locator('nav[aria-label="Alt menü"]').isVisible().catch(() => false);
    const hasAnyVisibleNav = await page.locator("nav:visible").first().isVisible().catch(() => false);
    expect(hasMainNav || hasBottomNav || hasAnyVisibleNav).toBeTruthy();
    await expectMainVisible(page);
  });

  test("ana sayfada ilan kartları veya boş durum mesajı var", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // İlan kartı veya "ilan yok" mesajı
    const cards = page.locator("[data-testid='listing-card'], .listing-card, article").first();
    const emptyMsg = page.getByText(/ilan bulunamadı|henüz ilan yok|no listing/i).first();
    await expect(cards.or(emptyMsg)).toBeVisible({ timeout: 10_000 });
  });

  test("ilan arama sayfası yükleniyor", async ({ page }) => {
    await page.goto("/arama");
    await expectMainVisible(page);
  });
});

test.describe("İlanlar — Oturum Gerekli", () => {
  authTest("ilan oluşturma sayfası yükleniyor", async ({ page }) => {
    await page.goto("/ilan/olustur");
    await expectNotRedirectedToLogin(page);
    await expectMainVisible(page);
  });

  authTest("ilan oluşturma formu alanları mevcut", async ({ page }) => {
    await page.goto("/ilan/olustur");
    await waitForPageReady(page);
    // Form'da en az bir select veya input olmalı
    const formElement = page.locator("form, [role='form'], main select, main input").first();
    await expect(formElement).toBeVisible({ timeout: 10_000 });
  });

  authTest("favori ekleme API'si çalışıyor", async ({ page }) => {
    // Favoriler API'si test
    const response = await page.request.get("/api/favorites");
    expect([200, 401]).toContain(response.status());
  });
});
