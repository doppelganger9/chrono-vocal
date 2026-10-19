// Témoin « micro silencieux » et événements du micro dans le journal vocal (#56)
const { test, expect } = require("./fixtures");

test.use({ micSilentMs: 30_000 });
const stale = (app) => app.$("#micStale");
const recognizers = (app) =>
  app.page.evaluate(() => window.__recLog.filter((x) => x === "new").length);
const journal = (app) =>
  app.page.evaluate(() =>
    JSON.parse(localStorage.getItem("chrono-canne-journal") || "[]"),
  );

test("rien reçu du micro depuis 30 s : le témoin apparaît, et disparaît dès que le micro entend", async ({
  app,
}) => {
  await app.wait(29_000);
  await expect(stale(app)).toBeHidden();
  await app.wait(1500);
  await expect(stale(app)).toBeVisible();
  await expect(stale(app)).toContainText(/Micro silencieux depuis 0:3\d/);
  await expect(app.$("#micBtn")).toHaveClass(/stale/);
  await app.hear("Allez");
  await app.wait(1000);
  await expect(stale(app)).toBeHidden();
  await expect(app.$("#micBtn")).not.toHaveClass(/stale/);
  expect(
    (await journal(app)).some((e) => e.event === "silence"),
    "l'épisode de silence est noté",
  ).toBe(true);
});

test("un toucher sur le témoin relance l'écoute avec une reconnaissance neuve", async ({
  app,
}) => {
  await app.wait(31_000);
  const n = await recognizers(app);
  await stale(app).click();
  expect(await recognizers(app)).toBe(n + 1);
  await app.wait(1000);
  await expect(stale(app)).toBeHidden();
  expect(
    (await journal(app)).some((e) => e.event === "relaunch"),
    "relance notée",
  ).toBe(true);
  await app.hear("Allez");
  await expect(app.phase).toHaveText("Assaut");
});

test("le bouton du micro, quand il est silencieux, relance au lieu de couper", async ({
  app,
}) => {
  await app.wait(31_000);
  const n = await recognizers(app);
  await app.$("#micBtn").click();
  expect(await recognizers(app)).toBe(n + 1);
  await expect(app.$("#micText")).toHaveText("À l'écoute");
});

test("micro coupé : pas de témoin", async ({ app }) => {
  await app.$("#micBtn").click();
  await expect(app.$("#micText")).toHaveText("Micro coupé");
  await app.wait(40_000);
  await expect(stale(app)).toBeHidden();
});

test("le journal exporté montre la vie du micro : démarrage, erreur, relances regroupées", async ({
  app,
}) => {
  await app.page.evaluate(() => {
    window.__rec.onerror({ error: "network" });
    window.__rec.onend();
  });
  await app.wait(500);
  await app.page.evaluate(() => window.__rec.onend());
  await app.wait(500);
  await app.hear("Allez");
  await app.$("#settingsBtn").click();
  await app.$("#journalExport").click();
  await expect.poll(() => app.shared()).toHaveLength(1);
  const [file] = await app.shared();
  const { journal: j } = JSON.parse(file.text);
  expect(j.map((e) => e.event || e.action)).toEqual([
    "start",
    "error",
    "restart",
    "ALLEZ",
  ]);
  expect(j[1].detail).toBe("network");
  expect(j[2].n).toBe(2);
});

for (const size of [
  { width: 375, height: 667 },
  { width: 844, height: 280 },
]) {
  test(`${size.width} × ${size.height} : le témoin tient à l'écran, même au repos avec les rappels`, async ({
    app,
    page,
  }) => {
    await page.setViewportSize(size);
    await app.addStyle(
      'html, body { font-family: Verdana, "DejaVu Sans", sans-serif !important; }',
    );
    await app.configure({ sRound: "0:05", sCalls: "" }); // sans annonces : sur iPhone, chacune relance l'écoute
    await app.hear("Allez");
    await app.wait(5000);
    await app.hear("Stop, fin de la reprise");
    await app.hear("Rappel, tireur bleu");
    await app.wait(32_000); // « Temps » (+0,6 s) relance l'écoute sur iPhone
    await expect(stale(app)).toBeVisible();
    await expect(stale(app)).toBeInViewport();
    expect(
      await page.evaluate(
        () =>
          document.scrollingElement.scrollHeight <= innerHeight + 1 &&
          document.scrollingElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
}
