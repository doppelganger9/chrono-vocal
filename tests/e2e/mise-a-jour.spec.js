// Mise à jour disponible (#96) : une version téléchargée pendant la visite, proposée quand rien n'est en cours.
// Le service worker est remplacé par une doublure (voir hors-ligne.spec.js) : le test déclenche lui-même le
// téléchargement d'une nouvelle version (window.__nouvelleVersion)
const { test, expect } = require("./fixtures");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const sw = new EventTarget();
    /** @type {unknown[]} */
    const posted = (window.__posted = []);
    const reg = Object.assign(new EventTarget(), {
      waiting: null,
      installing: null,
      update: async () => {},
    });
    window.__nouvelleVersion = () => {
      const w = Object.assign(new EventTarget(), {
        state: "installing",
        postMessage: (m) => posted.push(m),
      });
      reg.installing = w;
      reg.dispatchEvent(new Event("updatefound"));
      w.state = "installed";
      reg.waiting = w;
      reg.installing = null;
      w.dispatchEvent(new Event("statechange"));
    };
    Object.assign(sw, {
      controller: {},
      ready: new Promise(() => {}),
      register: async () => reg,
    });
    Object.defineProperty(Navigator.prototype, "serviceWorker", {
      get: () => sw,
    });
  });
});

const button = (app) => app.$("#updateBtn");

test("sans nouvelle version, pas de bouton", async ({ app }) => {
  await app.wait(1000);
  await expect(button(app)).toBeHidden();
});

test("nouvelle version téléchargée : un toucher la prend, et la page se recharge", async ({
  app,
  page,
}) => {
  await page.evaluate(() => window.__nouvelleVersion());
  await expect(button(app)).toBeVisible();
  await expect(button(app)).toHaveText(/Mise à jour disponible/);
  await button(app).click();
  expect(await page.evaluate(() => window.__posted)).toEqual(["activer"]);
  const reloaded = page.waitForEvent("load");
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange")),
  );
  await reloaded;
  await expect(app.main).toHaveText("ALLEZ");
});

test("jamais au milieu d'un assaut : caché pendant la reprise et le repos, de retour après « Réinitialiser »", async ({
  app,
  page,
}) => {
  await app.configure({ sRound: "0:05" });
  await app.hear("Allez");
  await page.evaluate(() => window.__nouvelleVersion());
  await app.wait(1000);
  await expect(button(app)).toBeHidden();
  await app.wait(5000);
  await app.hear("Stop, fin de la reprise");
  await app.wait(500);
  await expect(app.phase).toHaveText("Minute de repos");
  await expect(button(app)).toBeHidden();
  await app.$("#resetBtn").click();
  await app.$("#resetBtn").click(); // en deux appuis : un assaut est en cours
  await expect(button(app)).toBeVisible();
});

// Le bouton s'ajoute sous le chrono : rien ne déborde, même dans les formats les plus bas
for (const [name, size] of Object.entries({
  "petit Android portrait, barre du navigateur": { width: 360, height: 560 },
  "iPhone SE paysage": { width: 667, height: 375 },
  "iPhone paysage, barres Safari": { width: 844, height: 280 },
})) {
  test(`${name} : le bouton tient à l'écran, sans défilement`, async ({
    app,
    page,
  }) => {
    await page.setViewportSize(size);
    await page.evaluate(() => window.__nouvelleVersion());
    for (const sel of ["#updateBtn", "#time", "#mainBtn", ".bar"])
      await expect(page.locator(sel)).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () =>
          document.scrollingElement.scrollHeight <= innerHeight + 1 &&
          document.scrollingElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const time = await app.time.boundingBox(),
      header = await page.locator("header").boundingBox(),
      round = await app.round.boundingBox(),
      update = await button(app).boundingBox(),
      controls = await page.locator(".controls").boundingBox();
    expect(round.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(update.y).toBeGreaterThanOrEqual(time.y + time.height - 1);
    if (controls.y > round.y)
      expect(update.y + update.height).toBeLessThanOrEqual(controls.y + 1);
  });
}
