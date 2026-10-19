// Application hors ligne (#40) : une fois ouverte, l'app se recharge sans réseau
const { test, expect } = require("./fixtures");

test("sans réseau, l'app se recharge depuis le cache et fonctionne", async ({
  app,
  page,
  context,
}) => {
  test.skip(
    !(await page.evaluate(() => "serviceWorker" in navigator)),
    "pas de service worker dans ce navigateur de test",
  );
  // le service worker installé (tous les fichiers en cache), puis la page sous son contrôle
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(app.main).toHaveText("ALLEZ");
  await app.main.click();
  await app.wait(2000);
  await expect(app.time).toHaveText("1:28");
  await context.setOffline(false);
});
