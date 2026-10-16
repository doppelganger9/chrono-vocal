// Captures avant / après pour les PR (CONTRIBUTING.md § 4) : npm run avant-apres -- <ref>
const { defineConfig, devices } = require('@playwright/test');

const port = Number(process.env.SHOT_PORT) || 4173;
module.exports = defineConfig({
  testDir: 'tests/screenshots',
  fullyParallel: true,
  retries: 0,
  reporter: 'dot',
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'iphone-portrait', use: { ...devices['iPhone 14'] } },
    { name: 'iphone-paysage', use: { ...devices['iPhone 14 landscape'] } },
    { name: 'android-portrait', use: { ...devices['Pixel 7'] } },
    { name: 'android-paysage', use: { ...devices['Pixel 7 landscape'] } },
  ],
  webServer: { command: `PORT=${port} node tests/server.js`, url: `http://localhost:${port}`, reuseExistingServer: true },
});
