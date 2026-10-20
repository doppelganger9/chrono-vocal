// Écran titre au premier lancement (#6)
const { test, expect } = require("./fixtures");
const { version } = require("../../package.json");

test.describe("premier lancement", () => {
  test.use({ introSeen: false });

  test("l'écran titre s'affiche, « Commencer » active le micro, puis il ne revient plus", async ({
    app,
    page,
  }) => {
    const intro = page.locator("#intro");
    await expect(intro).toBeVisible();
    await expect(intro).toContainText("Chrono Canne");
    await expect(intro.locator("img")).toHaveAttribute("src", /logo\.svg$/);
    await page.locator("#introStart").click();
    await expect(intro).toBeHidden();
    await expect(page.locator("#micText")).toHaveText("À l'écoute");
    await page.reload();
    await expect(page.locator("#intro")).toBeHidden();
  });

  test("« Sans la voix » ferme l'écran titre sans activer le micro", async ({
    app,
    page,
  }) => {
    await page.locator("#introSkip").click();
    await expect(page.locator("#intro")).toBeHidden();
    await expect(page.locator("#micText")).toHaveText("Micro coupé");
  });
});

test.describe("nouvelle version depuis la dernière visite (#84)", () => {
  test.use({ introSeen: "1.1.0" });
  test("l'écran titre revient une fois, avec les notes des versions plus récentes", async ({
    app,
    page,
  }) => {
    const news = page.locator("#introNews");
    await expect(page.locator("#intro")).toBeVisible();
    await expect(news).toContainText("Quoi de neuf");
    // la date est celle de la publication (#101) : seule sa forme est vérifiée, « 20 octobre 2026 »
    const title = news.locator("h4").first();
    await expect(title).toContainText(`Version ${version} · `);
    await expect(title).toHaveText(/ · \d{1,2} \p{L}+ \d{4}$/u);
    await expect(news).not.toContainText("Version 1.1.0");
    await expect(news).not.toContainText("(#"); // pas de numéros d'issue
    await page.locator("#introSkip").click();
    expect(
      await page.evaluate(() => localStorage.getItem("chrono-canne-intro")),
    ).toBe(version);
  });
});

test.describe("valeur enregistrée avant #84 (numéro de présentation)", () => {
  test.use({ introSeen: 2 });
  test("vue avec la 1.0.0 : « Quoi de neuf » depuis la 1.1.0", async ({
    app,
    page,
  }) => {
    await expect(page.locator("#introNews")).toContainText("Version 1.1.0");
    await expect(page.locator("#introNews")).not.toContainText("Version 1.0.0");
  });
});

test("« À propos », dans les réglages : la présentation, la version et toutes les notes (#84)", async ({
  app,
  page,
}) => {
  await app.$("#settingsBtn").click();
  await expect(page.locator("#introAgain")).toHaveText(
    `À propos · version ${version}`,
  );
  await page.locator("#introAgain").click();
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#introVersion")).toHaveText(`Version ${version}`);
  const news = page.locator("#introNews");
  await expect(news).toContainText("Notes de version");
  await expect(news.locator("h4").last()).toHaveText(
    "Version 1.0.0 · 19 octobre 2026",
  );
  await expect(news.locator("h5").first()).toHaveText("Le chrono");
  // les boutons restent à l'écran : la liste des notes défile
  await expect(page.locator("#introStart")).toBeInViewport();
});

test.describe("stockage indisponible (navigation privée stricte)", () => {
  test.use({ introSeen: false, blockStorage: true });
  test("l'app démarre quand même, et l'écran titre se ferme", async ({
    app,
    page,
  }) => {
    await page.locator("#introSkip").click();
    await expect(page.locator("#intro")).toBeHidden();
    await page.locator("#mainBtn").click();
    await expect(page.locator("#phaseLabel")).toHaveText("Assaut");
  });
});

test("icône et manifeste pour l'écran d'accueil", async ({ app, page }) => {
  for (const sel of [
    'link[rel="apple-touch-icon"]',
    'link[rel="manifest"]',
    'link[rel="icon"]',
  ]) {
    const href = await page.locator(sel).getAttribute("href");
    const r = await page.request.get(href);
    expect(r.ok(), sel).toBe(true);
  }
  const manifest = await (
    await page.request.get("manifest.webmanifest")
  ).json();
  expect(manifest.name).toBe("Chrono Canne");
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
});
