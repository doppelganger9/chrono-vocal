// Numéro de version affiché (#39) : celui de package.json
const { test, expect } = require("./fixtures");
const { version } = require("../../package.json");

test("la version est affichée dans les réglages, sur le bouton « À propos » (#84)", async ({
  app,
}) => {
  await app.$("#settingsBtn").click();
  await expect(app.$("#introAgain")).toHaveText(
    `À propos · version ${version}`,
  );
});

test.describe("premier lancement", () => {
  test.use({ introSeen: false });
  test("la version est affichée sur l'écran titre", async ({ app }) => {
    await expect(app.$("#introVersion")).toHaveText(`Version ${version}`);
  });
});
