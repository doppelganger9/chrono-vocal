// Écrans clés photographiés pour les PR. Le même scénario est joué sur la version « avant » et sur la branche :
// une étape absente de l'ancienne version échoue simplement, et sa capture manque.
const path = require("node:path");
const { test } = require("../e2e/fixtures");

const dir = process.env.SHOT_DIR || "screenshots/apres";
// SHOT_SCHEME=light|dark : réglage jour / nuit simulé du téléphone ; SHOT_CSS : styles ajoutés (variantes de palette)
test.beforeEach(async ({ page }) => {
  if (process.env.SHOT_SCHEME)
    await page.emulateMedia({
      colorScheme: /** @type {'light' | 'dark'} */ (process.env.SHOT_SCHEME),
    });
});
// animations figées (clignotements, transitions) : deux versions identiques donnent des captures identiques
const shot = async (app, name, testInfo) => {
  if (process.env.SHOT_CSS) await app.addStyle(process.env.SHOT_CSS);
  return app.page.screenshot({
    path: path.join(dir, `${testInfo.project.name}--${name}.png`),
    animations: "disabled",
  });
};

test("prêt", async ({ app }, t) => {
  await shot(app, "1-pret", t);
});

test("assaut", async ({ app }, t) => {
  await app.hear("Allez");
  await app.wait(12_000);
  await shot(app, "2-assaut", t);
});

test("arrêt", async ({ app }, t) => {
  await app.hear("Allez");
  await app.wait(8000);
  await app.hear("Stop");
  await app.wait(4000);
  await shot(app, "3-arret", t);
});

test("fin du temps de reprise", async ({ app }, t) => {
  await app.configure({ sRound: "0:05" });
  await app.hear("Allez");
  await app.wait(9000);
  await shot(app, "4-fin-du-temps", t);
});

test("minute de repos", async ({ app }, t) => {
  await app.configure({ sRound: "0:05" });
  await app.hear("Allez");
  await app.wait(5500);
  await app.$("#skipBtn").click();
  await app.wait(1500);
  if ((await app.phase.textContent()) !== "Minute de repos")
    await app.main.click(); // anciennes versions : STOP · REPOS
  await app.wait(22_000);
  await shot(app, "5-repos", t);
});

test("repos : sous-titre de l'arbitre", async ({ app }, t) => {
  await app.configure({ sRound: "0:05" });
  await app.hear("Allez");
  await app.wait(5500);
  await app.$("#skipBtn").click();
  await app.wait(46_000);
  await shot(app, "5c-repos-sous-titre", t);
});

test("statistiques", async ({ app }, t) => {
  await app.configure({ sRounds: "1", sRound: "0:20" });
  await app.hear("Allez");
  await app.wait(5000);
  await app.hear("Stop");
  await app.hear("Pénalité pour sortie d'aire, tireur bleu");
  await app.wait(6000);
  await app.hear("Allez");
  await app.$("#statsBtn").click();
  await shot(app, "6-statistiques", t);
});

test("rappels à l'appel", async ({ app }, t) => {
  await app.configure({ sRound: "0:05" });
  await app.hear("Allez");
  await app.wait(5500);
  await app.$("#skipBtn").click();
  await app.wait(1500);
  await app.hear("Rappel, tireur bleu");
  await shot(app, "5b-rappel", t);
  await app.$("#statsBtn").click();
  await app
    .$("#statsBody")
    .evaluate((el) => el.lastElementChild?.scrollIntoView());
  await shot(app, "6b-statistiques-rappel", t);
});

test("réglages", async ({ app }, t) => {
  await app.$("#settingsBtn").click();
  await shot(app, "7-reglages", t);
});

test("chronomètre annexe", async ({ app }, t) => {
  await app.$("#annexBtn").click();
  await app.$("#annexStart").click();
  await app.wait(65_000);
  await shot(app, "7b-annexe", t);
  await app.$("#annexSecond").click(); // second exclu (#9) : absent des anciennes versions
  await app.$("#annexStart").click();
  await app.wait(65_000);
  await shot(app, "7c-annexe-second", t);
});

test("mode tableau", async ({ app }, t) => {
  await app.configure({ sBoard: "1" });
  await app.hear("Allez");
  await app.wait(12_000);
  await shot(app, "8-tableau", t);
});

test.describe("écran titre", () => {
  test.use({ introSeen: false });
  test("premier lancement", async ({ app }, t) => {
    await shot(app, "0-ecran-titre", t);
  });
});

test.describe("micro silencieux (#56)", () => {
  test.use({ micSilentMs: 30_000 });
  test("témoin", async ({ app }, t) => {
    await app.hear("Allez");
    await app.wait(35_000);
    await shot(app, "9-micro-silencieux", t);
  });
});
