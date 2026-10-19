// Réglages hostiles (#55) : un lien partagé ou un stockage modifié ne doit ni casser l'app, ni injecter de HTML.
// Toute erreur JavaScript de la page fait échouer le test (fixtures.js).
const { test, expect } = require("./fixtures");

const HTML = '<img src=x onerror="window.__pwned=1">';
const evilLink = (cfg) =>
  "/#reglages=" +
  Buffer.from(JSON.stringify({ app: "chrono-canne", cfg })).toString(
    "base64url",
  );
const pwned = (page) =>
  page.evaluate(
    () =>
      !!window.__pwned || !!document.querySelector("main img, #statsBody img"),
  );

test.describe("stockage modifié", () => {
  test.use({
    savedSettings: {
      v: 5,
      colors: [HTML, "bleu("],
      rounds: "beaucoup",
      roundSec: 5,
      calls: "trente",
    },
  });

  test("l'app démarre avec des réglages sûrs, la voix et les rappels marchent", async ({
    app,
    page,
  }) => {
    await expect(app.round).toHaveText("Reprise 1 / 3"); // « beaucoup » de reprises : la valeur par défaut
    await app.hear("Allez");
    await app.wait(5000);
    await app.hear("Stop, fin de la reprise");
    await app.hear("Observation tireur bleu"); // couleur « bleu( » écartée : la voix ne plante pas
    await app.hear("Rappel, tireur rouge");
    await expect(app.$('#rappels button[data-color="rouge"]')).toBeVisible();
    await app.$("#statsBtn").click();
    await expect(app.$("#statsBody")).toContainText("rouge");
    expect(await pwned(page)).toBe(false);
  });
});

test("un lien de réglages hostile : rien d'injecté, des réglages sûrs appliqués", async ({
  app,
  page,
}) => {
  await page.goto("about:blank");
  await page.goto(
    evilLink({
      v: 5,
      colors: ["vert", HTML],
      rounds: 2,
      roundSec: "x",
      learned: { ALLEZ: [HTML] },
      palette: { round: "red;}" },
    }),
  );
  await expect(page.locator("#importDlg")).toBeVisible();
  await page.locator("#importApply").click();
  await expect(app.round).toHaveText("Reprise 1 / 2");
  await app.$("#settingsBtn").click();
  await expect(page.locator("#sColor1")).toHaveValue("vert");
  await expect(page.locator("#sColor2")).toHaveValue("bleu");
  expect(await pwned(page)).toBe(false);
});
