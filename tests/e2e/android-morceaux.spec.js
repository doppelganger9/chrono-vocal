// Android (Samsung S7) : chaque morceau d'une phrase arrive comme phrase finie (#110). La doublure de la
// reconnaissance donne déjà un nouvel index à chaque résultat, comme ce téléphone.
const { test, expect } = require("./fixtures");

test("une pénalité dite en morceaux est comptée une fois, et s'annule d'un coup", async ({
  app,
}) => {
  await app.configure({ sRounds: 1, sRound: "0:30" });
  await app.hear("Allez");
  await app.wait(2000);
  await app.hear("Stop");
  await app.hear("Stop"); // redit tel quel : pas de « sans effet »
  await expect(app.heard).toHaveText("🎙 STOP (« Stop »)");
  for (const t of [
    "pénalité",
    "pénalité tir",
    "pénalité tir en bleu",
    "pénalité tir en bleu pour lâcher de canne",
  ])
    await app.hear(t);
  await expect(app.heard).toHaveText("📝 Pénalité (lâcher de canne) bleu");

  await app.$("#statsBtn").click();
  const rows = app.$("#statsBody table").last().locator("tr");
  await expect(rows.nth(2)).toContainText("bleu");
  await expect(rows.nth(2).locator("td").last()).toHaveText("1"); // une pénalité : 1 point à l'adversaire
  await app.page.keyboard.press("Escape");

  await app.$("#undoBtn").click();
  await expect(app.heard).toHaveText("↶ PÉNALITÉ annulé");
});
