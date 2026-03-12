/**
 * 19 — API Kapsamlı Sağlık Testi
 * Tüm API endpoint'lerini hızlıca kontrol eder (smoke test)
 */
import { test, expect } from "@playwright/test";
import { authTest } from "./helpers";

const PUBLIC_ENDPOINTS = [
  "/api/sports",
  "/api/locations",
  "/api/leaderboard",
];

const AUTH_ENDPOINTS = [
  "/api/posts",
  "/api/feed",
  "/api/notifications",
  "/api/favorites",
  "/api/groups",
  "/api/clubs",
  "/api/communities",
  "/api/tournaments",
  "/api/listings",
  "/api/profile",
  "/api/recommendations",
  "/api/activities",
  "/api/follows",
  "/api/follow-requests",
  "/api/conversations",
  "/api/challenges",
  "/api/streak",
  "/api/leaderboard/friends",
];

// Bu endpoint'ler parametre/sorgu gerektirir, 400/404 de kabul edilebilir
const PARAM_ENDPOINTS = [
  "/api/matches",
  "/api/ratings",
  "/api/users",
  "/api/venues",
  "/api/venue-profile",
];

test.describe("API Smoke Test — Public", () => {
  for (const endpoint of PUBLIC_ENDPOINTS) {
    test(`GET ${endpoint} → 200`, async ({ page }) => {
      const response = await page.request.get(endpoint);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe("API Smoke Test — Authenticated", () => {
  for (const endpoint of AUTH_ENDPOINTS) {
    authTest(`GET ${endpoint} → 200`, async ({ page }) => {
      const response = await page.request.get(endpoint);
      expect([200, 304]).toContain(response.status());
    });
  }

  for (const endpoint of PARAM_ENDPOINTS) {
    authTest(`GET ${endpoint} → geçerli yanıt`, async ({ page }) => {
      const response = await page.request.get(endpoint);
      // Parametre gerektiren endpoint'ler 200/304/400/404 dönebilir
      expect(response.status()).toBeLessThan(500);
    });
  }
});

test.describe("API Koruma Testi", () => {
  const protectedEndpoints = [
    "/api/notifications",
    "/api/favorites",
    "/api/conversations",
    "/api/profile",
  ];

  for (const endpoint of protectedEndpoints) {
    test(`GET ${endpoint} oturumsuz → 401`, async ({ page }) => {
      const response = await page.request.get(endpoint);
      expect([401, 403]).toContain(response.status());
    });
  }
});
