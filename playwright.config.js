// Tests de bout en bout : la vraie page, sur les moteurs des téléphones visés
// (Chromium pour Android/Chrome, WebKit pour Safari/iPhone)
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    {
      name: "android-chrome",
      use: { ...devices["Pixel 7"], launchOptions: { args: ["--mute-audio"] } },
    },
    { name: "iphone-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "node tests/server.js",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
