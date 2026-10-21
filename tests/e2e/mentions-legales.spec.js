// Mentions légales et confidentialité (#86) : une page du site, liée depuis l'écran titre et « À propos »
const { test, expect } = require("./fixtures");

test.describe("premier lancement", () => {
  test.use({ introSeen: false });

  test("l'écran titre dit où part la voix, et mène à la page, qui ramène au chrono", async ({
    app,
    page,
  }) => {
    await expect(page.locator("#introPrivacy")).toContainText(
      "Sur iPhone, la voix reste sur le téléphone ; sur Android, Chrome l'envoie à Google pour la reconnaître.",
    );
    await page.locator("#introLegal").click();
    await expect(page).toHaveURL(/\/mentions-legales\.html$/);
    await expect(page.locator("h1")).toHaveText(
      "Mentions légales et confidentialité",
    );
    await page.getByRole("link", { name: "Retour au chrono" }).first().click();
    await expect(page.locator("#intro")).toBeVisible();
  });
});

test("« À propos » mène à la page quand rien n'est en cours, jamais au milieu d'un assaut", async ({
  app,
  page,
}) => {
  await app.$("#settingsBtn").click();
  await app.$("#introAgain").click();
  await expect(page.locator("#introLegal")).toBeVisible();
  await page.locator("#introSkip").click();

  // quitter la page pendant un assaut arrêterait le chrono
  await app.hear("Allez");
  await app.wait(1000);
  await app.$("#settingsBtn").click();
  await app.$("#introAgain").click();
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#introLegal")).toBeHidden();
  await expect(page.locator("#introPrivacy")).toBeVisible();
});

test("la page suit le thème choisi dans l'app", async ({ app, page }) => {
  await app.configure({ sTheme: "jour" });
  await page.goto("/mentions-legales.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "jour");
  await page.goto("/");
  await app.configure({ sTheme: "nuit" });
  await page.goto("/mentions-legales.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "nuit");
});

test.describe("stockage indisponible", () => {
  test.use({ blockStorage: true });
  test("la page s'affiche quand même, dans le thème par défaut", async ({
    app,
    page,
  }) => {
    await page.goto("/mentions-legales.html");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /.+/);
  });
});

test("disponible sans réseau, une fois l'app ouverte", async ({
  app,
  page,
  context,
}) => {
  test.skip(
    !(await page.evaluate(() => "serviceWorker" in navigator)),
    "pas de service worker dans ce navigateur de test",
  );
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/mentions-legales.html");
  await expect(page.locator("h1")).toHaveText(
    "Mentions légales et confidentialité",
  );
  await context.setOffline(false);
});
