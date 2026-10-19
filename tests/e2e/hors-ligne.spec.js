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

// Le service worker est remplacé ici par une doublure : le navigateur de test ne laisse pas publier une deuxième
// version de sw.js. La réponse du vrai sw.js au message « activer » est vérifiée par tests/unit/sw.test.js
test.describe("nouvelle version en attente (iPhone, #84)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const sw = new EventTarget();
      /** @type {unknown[]} */
      const posted = (window.__posted = []);
      Object.assign(sw, {
        controller: {},
        ready: new Promise(() => {}),
        register: async () => ({
          waiting: sessionStorage.getItem("pris")
            ? null
            : { postMessage: (m) => posted.push(m) },
        }),
      });
      Object.defineProperty(Navigator.prototype, "serviceWorker", {
        get: () => sw,
      });
    });
  });

  test("prise à l'ouverture de la page, qui se recharge avec elle", async ({
    app,
    page,
  }) => {
    await expect
      .poll(() => page.evaluate(() => window.__posted))
      .toEqual(["activer"]);
    const reloaded = page.waitForEvent("load");
    await page.evaluate(() => {
      sessionStorage.setItem("pris", "1");
      navigator.serviceWorker.dispatchEvent(new Event("controllerchange"));
    });
    await reloaded;
    await expect(app.main).toHaveText("ALLEZ");
    expect(await page.evaluate(() => window.__posted)).toEqual([]);
  });
});
