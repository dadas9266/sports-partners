import { mobileAuthTest, expect, ensureVenueProfile, expectNotRedirectedToLogin, expectToast, waitForPageReady } from "./helpers";

mobileAuthTest.describe("21 — Mobile Venue Smoke", () => {
  mobileAuthTest("venue owner mobilde tesis yonetimine ulasip kayit yapabilir", async ({ page }) => {
    const venueName = "Arena 34 Mobile Smoke";
    const updatedHours = "Her gun 06:30-23:30";

    await ensureVenueProfile(page, {
      businessName: venueName,
      openingHours: "Hafta ici 07:00-23:00\nHafta sonu 08:00-22:00",
    });

    await page.goto("/ayarlar/isletme");
    await waitForPageReady(page);
    await expectNotRedirectedToLogin(page);
    await expect(page.getByRole("heading", { name: venueName })).toBeVisible();
    await expect(page.getByRole("button", { name: /tesis bilgileri/i })).toBeVisible();

    await page.getByRole("button", { name: /tesis bilgileri/i }).click();
    await expect(page.getByRole("heading", { name: /tesis bilgilerini düzenle|tesis bilgilerini duzenle/i })).toBeVisible();
    await page.locator("#venue-opening-hours").fill(updatedHours);
    await page.getByRole("button", { name: /kaydet/i }).click();
    await expectToast(page, /tesis bilgileri guncellendi|tesis bilgileri güncellendi/i, 10_000);
    await expect(page.getByText(updatedHours)).toBeVisible();

    await page.getByRole("button", { name: /daha fazla/i }).click();
    await expect(page.getByText(/^Dil$/)).toBeVisible();
    await expect(page.getByRole("link", { name: /tesis yonetimi|tesis yönetimi/i })).toBeVisible();
    await page.getByRole("link", { name: /tesis yonetimi|tesis yönetimi/i }).click();

    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/ayarlar\/isletme/i);
    await expect(page.getByRole("heading", { name: venueName })).toBeVisible();
  });
});
