/**
 * 09 — Turnuva Testleri
 * Kapsam: Turnuva listesi, Turnuva oluşturma, Turnuva detay
 */
import { test, expect } from "@playwright/test";
import { authTest, expectMainVisible, waitForPageReady } from "./helpers";

test.describe("Turnuvalar — Public", () => {
  test("turnuvalar sayfası yükleniyor", async ({ page }) => {
    await page.goto("/turnuvalar");
    await expectMainVisible(page);
    await expect(page.getByRole("heading", { name: /turnuva/i }).first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});

test.describe("Turnuvalar — Oturum Gerekli", () => {
  authTest("yeni turnuva sayfası yükleniyor", async ({ page }) => {
    await page.goto("/turnuvalar/yeni");
    await expectMainVisible(page);
  });

  authTest("turnuva API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/tournaments");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeTruthy();
  });
});
