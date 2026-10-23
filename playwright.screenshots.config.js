// Captures avant / après pour les PR (CONTRIBUTING.md § 4) : npm run avant-apres -- <ref>
const { defineConfig, devices } = require("@playwright/test");
const { toutEnChromium } = require("./scripts/lib/cloud.js");

const port = Number(process.env.SHOT_PORT) || 4173;
module.exports = defineConfig({
  testDir: "tests/screenshots",
  fullyParallel: true,
  retries: 0,
  reporter: "dot",
  use: { baseURL: `http://localhost:${port}` },
  // dans une session de Claude Code dans le cloud : tout rendu par le Chromium préinstallé (scripts/lib/cloud.js)
  projects: toutEnChromium(
    [
      { name: "iphone-portrait", use: { ...devices["iPhone 14"] } },
      { name: "iphone-paysage", use: { ...devices["iPhone 14 landscape"] } },
      { name: "android-portrait", use: { ...devices["Pixel 7"] } },
      { name: "android-paysage", use: { ...devices["Pixel 7 landscape"] } },
      // Safari avec la barre d'adresse et les onglets : la page n'a plus que 280 px de haut en paysage
      {
        name: "iphone-paysage-safari",
        use: {
          ...devices["iPhone 14 landscape"],
          viewport: { width: 844, height: 280 },
        },
      },
    ],
    process.env,
  ),
  webServer: {
    command: `PORT=${port} node tests/server.js`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
