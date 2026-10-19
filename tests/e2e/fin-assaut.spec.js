// « Fin de l'assaut » à tout moment (#77) : en reprise comme au repos ; « Annuler » revient en arrière
const { test, expect } = require("./fixtures");

test("« Fin de l'assaut » pendant la minute de repos : l'assaut se termine, et « Annuler » y revient", async ({
  app,
}) => {
  await app.configure({ sRounds: 3, sRound: "0:10" });
  await app.hear("Allez");
  await app.wait(3000);
  await app.hear("Stop, fin de la reprise");
  await expect(app.phase).toHaveText("Minute de repos");
  await app.hear("Fin de l'assaut");
  await expect(app.phase).toHaveText("Fin de l'assaut");
  await app.wait(1600); // résumé vocal, puis statistiques
  await app.expectSpoken("Fin de l'assaut. Aucun arrêt.");
  await app.$("#closeStats").click();
  await app.$("#undoBtn").click();
  await expect(app.phase).toHaveText("Minute de repos");
});

test("« Stop, fin de l'assaut » à la 1re reprise sur 3 : l'assaut se termine", async ({
  app,
}) => {
  await app.configure({ sRounds: 3, sRound: "1:30" });
  await app.hear("Allez");
  await app.wait(5000);
  await app.hear("Stop, fin de l'assaut");
  await expect(app.phase).toHaveText("Fin de l'assaut");
});
