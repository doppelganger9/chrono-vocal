// Export / import des réglages entre téléphones (#15)
const { test, expect } = require("./fixtures");

test("le lien de partage, ouvert sur un autre téléphone, propose d'appliquer les réglages", async ({
  app,
  page,
}) => {
  await app.configure({ sRounds: 4, sRound: "2:00" });
  await app.$("#settingsBtn").click();
  await app.$("#shareLink").click();
  const link = await page.locator("#shareUrl").inputValue();
  expect(link).toMatch(/#reglages=[A-Za-z0-9_-]+$/);
  await page.evaluate(() => localStorage.removeItem("chrono-canne")); // « autre téléphone »
  await page.goto("about:blank"); // ouvrir le lien charge la page (pas une simple ancre)
  await page.goto(link);
  await expect(page.locator("#importDlg")).toBeVisible();
  await expect(page.locator("#importDiff")).toContainText("Nombre de reprises");
  await expect(page.locator("#importDiff")).toContainText("2:00");
  await page.locator("#importApply").click();
  await expect(page.locator("#importDlg")).toBeHidden();
  await expect(app.round).toHaveText("Reprise 1 / 4");
  await expect(app.time).toHaveText("2:00");
  expect(page.url()).not.toContain("#reglages="); // le lien n'est appliqué qu'une fois
});

test("importer un fichier, ou refuser", async ({ app, page }) => {
  await app.$("#settingsBtn").click();
  const file = {
    name: "r.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "chrono-canne",
        cfg: { v: 5, rounds: 2, roundSec: 90 },
      }),
    ),
  };
  await page.locator("#importFile").setInputFiles(file);
  await expect(page.locator("#importDiff")).toContainText("Nombre de reprises");
  await page.locator("#importCancel").click();
  await expect(app.round).toHaveText("Reprise 1 / 3"); // rien n'a changé
});

test("un lien invalide est signalé, sans rien changer", async ({
  app,
  page,
}) => {
  await page.goto("about:blank");
  await page.goto("/#reglages=abc");
  await expect(page.locator("#importDlg")).toBeVisible();
  await expect(page.locator("#importError")).toHaveText(
    "Fichier ou lien illisible.",
  );
  await expect(page.locator("#importApply")).toBeHidden();
});
