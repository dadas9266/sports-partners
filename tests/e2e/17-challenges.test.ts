/**
 * 17 — Challenge (Meydan Okuma) Testleri
 */
import { test, expect } from "@playwright/test";
import { authTest } from "./helpers";

test.describe("Meydan Okuma — API", () => {
  authTest("challenge API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/challenges");
    expect([200, 401]).toContain(response.status());
  });
});
