import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration
 *
 * Testleri çalıştırmak için:
 *   npx playwright test
 *   npx playwright test --ui          (UI modunda)
 *   npx playwright test --headed      (tarayıcı görünür)
 *   npx playwright show-report        (son raporu göster)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/.output",

  // Her test için zaman aşımı
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Tüm testler paralel çalışabilir ama auth testleri sıralı
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    // Setup: auth state kaydet
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Chrome — ana test suite
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // Mobile (opsiyonel — CI'da kapalı)
    // {
    //   name: "mobile-chrome",
    //   use: { ...devices["Pixel 5"] },
    //   dependencies: ["setup"],
    // },
  ],

  // dev server'ı otomatik başlat (yoksa)
  webServer: {
    command: "npx next dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
