// Rappels à l'appel de la reprise (C15, #8) : boutons pendant le repos et en « prêt », voix, annulation, statistiques
const { test, expect } = require("./fixtures");

const toRest = async (app) => {
  await app.configure({ sRounds: 2, sRound: "0:10" });
  await app.hear("Allez");
  await app.wait(10_000);
  await app.hear("Stop, fin de la reprise");
  await expect(app.phase).toHaveText("Minute de repos");
};

test("pas de bouton de rappel avant l'assaut ni pendant une reprise", async ({
  app,
}) => {
  await expect(app.$("#rappels")).toBeHidden();
  await app.hear("Allez");
  await expect(app.$("#rappels")).toBeHidden();
});

test("bouton de rappel : le rang du rappel donne la sanction, par tireur", async ({
  app,
}) => {
  await toRest(app);
  const bleu = app.$('#rappels button[data-color="bleu"]');
  const rouge = app.$('#rappels button[data-color="rouge"]');
  await expect(bleu).toHaveText("Rappel bleu · observation");
  await bleu.click();
  await expect(app.heard).toHaveText(
    "📝 1er rappel : Observation (retard à l'appel) bleu",
  );
  await expect(bleu).toHaveText("Rappel bleu · pénalité");
  await expect(rouge).toHaveText("Rappel rouge · observation");
  await bleu.click();
  await expect(bleu).toHaveText("Rappel bleu · carton jaune");

  // annulable, comme les autres commandes
  await app.$("#undoBtn").click();
  await expect(bleu).toHaveText("Rappel bleu · pénalité");

  // en « prêt », après le repos, les rappels restent possibles
  await app.wait(60_000);
  await expect(app.phase).toHaveText("Prêt — en garde");
  await bleu.click();
  await expect(app.heard).toContainText("2e rappel : Pénalité");
  await app.hear("Allez");
  await expect(app.$("#rappels")).toBeHidden();

  await app.$("#statsBtn").click();
  const rows = app.$("#statsBody table").last().locator("tr");
  await expect(rows.nth(2)).toContainText("bleu");
  await expect(rows.nth(2).locator("td").nth(1)).toHaveText("1"); // observation
  await expect(rows.nth(2).locator("td").nth(2)).toHaveText("1"); // pénalité
  await expect(rows.nth(2).locator("td").last()).toHaveText("1"); // 1 point à l'adversaire
  await expect(app.$("#statsBody")).toContainText(
    "Reprise 2 : 1er rappel, Observation (retard à l'appel) bleu",
  );
});

test("rappel à la voix : « rappel, tireur bleu »", async ({ app }) => {
  await toRest(app);
  await app.hear("Rappel, tireur bleu");
  await expect(app.heard).toHaveText(
    "📝 1er rappel : Observation (retard à l'appel) bleu",
  );
  await app.hear("rappel");
  await expect(app.heard).toHaveText(
    "🎙 Rappel entendu — quel tireur ? (rouge, bleu)",
  );
  await app.$("#skipBtn").click(); // fin du repos
  await app.hear("En garde, allez");
  await expect(app.phase).toHaveText("Assaut");
  await app.hear("Rappel, tireur rouge");
  await expect(app.heard).toHaveText("🎙 Rappel entendu — sans effet : Assaut");
});
