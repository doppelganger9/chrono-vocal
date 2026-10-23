// Tests de bout en bout : la vraie page, sur les moteurs des téléphones visés
// (Chromium pour Android/Chrome, WebKit pour Safari/iPhone)
const { defineConfig, devices } = require("@playwright/test");
const { sansWebkit } = require("./scripts/lib/cloud.js");

module.exports = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  // dans une session de Claude Code dans le cloud : Chromium préinstallé, sans WebKit (scripts/lib/cloud.js)
  projects: sansWebkit(
    [
      {
        name: "android-chrome",
        use: {
          ...devices["Pixel 7"],
          launchOptions: { args: ["--mute-audio"] },
        },
      },
      { name: "iphone-safari", use: { ...devices["iPhone 14"] } },
    ],
    process.env,
  ),
  webServer: {
    command: "node tests/server.js",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
