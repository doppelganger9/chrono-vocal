// Numéro de version affiché (#39) : celui de package.json
const { test, expect } = require("./fixtures");
const { version } = require("../../package.json");

test("la version est affichée dans les réglages", async ({ app }) => {
  await app.$("#settingsBtn").click();
  await expect(app.$("#settingsVersion")).toHaveText(`Chrono Canne ${version}`);
});

test.describe("premier lancement", () => {
  test.use({ introSeen: false });
  test("la version est affichée sur l'écran titre", async ({ app }) => {
    await expect(app.$("#introVersion")).toHaveText(`Version ${version}`);
  });
});
