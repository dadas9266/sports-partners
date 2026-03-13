/**
 * Ortak test yardımcıları ve konfigürasyonu
 */
import { test as base, expect, Page, devices } from "@playwright/test";
import path from "path";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

/** Oturum açmış test fixture */
export const authTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

/** Mobil oturum açmış test fixture */
export const mobileAuthTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices["Pixel 5"],
      storageState: AUTH_FILE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

/** Gerekirse test kullanıcısını venue owner'a dönüştür */
export async function ensureVenueProfile(page: Page, overrides: Record<string, unknown> = {}) {
  const response = await page.request.put("/api/venue-profile", {
    data: {
      businessName: "Arena 34 Test Tesisi",
      address: "Moda Caddesi No:34 Kadikoy / Istanbul",
      description: "Mobil venue smoke testi icin hazirlanan test profili.",
      phone: "05550001122",
      website: "https://arena34.example.com",
      capacity: 120,
      sports: ["Futbol", "Tenis"],
      images: [],
      openingHours: "Hafta ici 07:00-23:00\nHafta sonu 08:00-22:00",
      logoUrl: null,
      sportDetails: {
        Futbol: { sahaType: "Hali", sahaCount: "2" },
        Tenis: { sahaType: "Sert", sahaCount: "3" },
      },
      amenities: ["☕ Kafeterya", "🅿️ Otopark", "📶 Wi-Fi"],
      ...overrides,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

/** Sayfa yüklenene kadar bekle + network idle */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded");
}

/** Toast mesajı bekle */
export async function expectToast(page: Page, pattern: RegExp, timeout = 5000) {
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
}

/** API response'unu bekle */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, status = 200) {
  return page.waitForResponse(
    (res) => {
      const url = typeof urlPattern === "string" ? res.url().includes(urlPattern) : urlPattern.test(res.url());
      return url && res.status() === status;
    },
    { timeout: 10_000 }
  );
}

/** Main visible kontrolü — sayfa yüklendi mi? */
export async function expectMainVisible(page: Page) {
  await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
}

/** Auth sayfasına yönlendirme olmadığını kontrol et */
export async function expectNotRedirectedToLogin(page: Page) {
  await expect(page).not.toHaveURL(/\/auth\/giris/i);
}

export { expect };
