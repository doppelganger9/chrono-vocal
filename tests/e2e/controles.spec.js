// Boutons et télécommande Bluetooth
const { test, expect } = require("./fixtures");

test("télécommande : « suivant » = bouton principal, « précédent » = annuler", async ({
  app,
  page,
}) => {
  await page.keyboard.press("PageDown");
  await expect(app.phase).toHaveText("Assaut");
  await page.keyboard.press("PageDown");
  await expect(app.phase).toHaveText("Arrêt");
  await page.keyboard.press("PageUp");
  await expect(app.phase).toHaveText("Assaut");
});

test("réinitialiser en cours d'assaut demande une confirmation", async ({
  app,
}) => {
  await app.main.click();
  await app.wait(2000);
  const reset = app.$("#resetBtn");
  await reset.click();
  await expect(reset).toHaveText("Confirmer ?");
  await app.wait(3500); // sans 2e appui, rien ne se passe
  await expect(reset).toHaveText("Réinitialiser");
  await expect(app.phase).toHaveText("Assaut");
  await reset.click();
  await reset.click();
  await expect(app.phase).toHaveText("Prêt — en garde");
  await expect(app.time).toHaveText("1:30");
});

test("« Fin de la reprise » et « Fin du repos » passent à l'étape suivante", async ({
  app,
}) => {
  const skip = app.$("#skipBtn");
  await expect(skip).toBeDisabled();
  await app.main.click();
  await expect(skip).toHaveText("Fin de la reprise");
  await skip.click(); // décision de l'arbitre, à tout moment
  await expect(app.phase).toHaveText("Minute de repos");
  await expect(skip).toHaveText("Fin du repos");
  await skip.click();
  await expect(app.round).toHaveText("Reprise 2 / 3");
});
