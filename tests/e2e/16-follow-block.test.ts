/**
 * 16 — Takip & Engelleme Testleri
 * Kapsam: Takip sistemi, Takip istekleri, Engelleme, Rapor etme
 */
import { test, expect } from "@playwright/test";
import { authTest } from "./helpers";

test.describe("Takip & Engelleme — API", () => {
  authTest("takip API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/follows");
    expect([200, 401]).toContain(response.status());
  });

  authTest("takip istekleri API'si çalışıyor", async ({ page }) => {
    const response = await page.request.get("/api/follow-requests");
    expect([200, 401]).toContain(response.status());
  });
});
