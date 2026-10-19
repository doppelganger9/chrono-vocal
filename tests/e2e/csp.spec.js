// Politique de sécurité du contenu (#37) : sans style en ligne, les pastilles des tireurs gardent leur couleur.
// Toute violation de la politique fait échouer les tests (fixtures.js).
const { test, expect } = require("./fixtures");

test("pastilles des tireurs colorées, dans les rappels et les statistiques", async ({
  app,
}) => {
  await app.configure({ sRounds: 2, sRound: "0:10" });
  await app.hear("Allez");
  await app.wait(10_000);
  await app.hear("Stop, fin de la reprise");
  const dot = (sel) => app.$(sel).locator(".tireur-dot").first();
  await expect(dot('#rappels button[data-color="bleu"]')).toHaveCSS(
    "background-color",
    "rgb(59, 130, 246)",
  );
  await expect(dot('#rappels button[data-color="rouge"]')).toHaveCSS(
    "background-color",
    "rgb(229, 72, 77)",
  );
  await app.$('#rappels button[data-color="bleu"]').click();
  await app.$("#statsBtn").click();
  await expect(dot(`#statsBody tr:has-text("bleu")`)).toHaveCSS(
    "background-color",
    "rgb(59, 130, 246)",
  );
});
