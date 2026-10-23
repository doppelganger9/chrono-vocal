// Captation audio de terrain (#136) : le son de l'aire enregistré sur le téléphone, pour la banque sonore
const { test, expect } = require("./fixtures");

/** @param {import('./fixtures').App} app */
async function openCapture(app) {
  await app.$("#settingsBtn").click();
  await app.$("#captureOpen").click();
  await expect(app.$("#captureDlg")).toBeVisible();
}

test("démarrer, voir le témoin, arrêter, exporter le fichier horodaté", async ({
  app,
  page,
}) => {
  await expect(app.$("#captureBtn")).toBeHidden();
  await openCapture(app);
  await expect(app.$("#captureStatus")).toHaveText("Captation arrêtée");
  await expect(app.$("#captureList")).toHaveText("Aucun fichier.");
  await expect(app.$("#captureExportAll")).toBeDisabled();
  await app.$("#captureToggle").click();
  await expect(app.$("#captureToggle")).toHaveText("Arrêter la captation");
  await expect(app.$("#captureStatus")).toHaveText(
    "● Enregistrement en cours · 0:00",
  );
  // le fichier en cours est listé, mais ne s'efface pas
  await expect(app.$("#captureList .capture-row")).toHaveCount(1);
  await expect(app.$("#captureList [data-remove]")).toBeDisabled();
  await app.$("#captureClose").click();
  // l'assaut se joue pendant la captation, la reconnaissance marche toujours
  await expect(app.$("#captureBtn")).toBeVisible();
  await app.hear("Allez");
  await app.wait(12_000);
  await app.hear("Stop");
  await expect(app.phase).toHaveText("Arrêt");
  await expect(app.$("#captureTime")).toHaveText("0:12");
  // le témoin rouvre la fenêtre
  await app.$("#captureBtn").click();
  await expect(app.$("#captureDlg")).toBeVisible();
  await app.$("#captureToggle").click();
  await expect(app.$("#captureStatus")).toHaveText("Captation arrêtée");
  await expect(app.$("#captureBtn")).toBeHidden();
  await app.wait(500); // le dernier morceau arrive juste après l'arrêt
  await expect
    .poll(() => page.evaluate(() => window.__micTrack.stopped))
    .toBe(true);
  const row = app.$("#captureList .capture-row");
  await expect(row).toHaveCount(1);
  await expect(row.locator("span")).toContainText(
    /^chrono-canne-captation-2026-10-17-10h00m\d\d\.webm/,
  );
  await expect(row.locator("small")).toHaveText(/^0:1\d · 1 Ko$/);
  await expect(row.locator("[data-remove]")).toBeEnabled();
  await row.locator("[data-export]").click();
  await expect.poll(() => app.shared()).toHaveLength(1);
  const [file] = await app.shared();
  expect(file.name).toMatch(
    /^chrono-canne-captation-2026-10-17-10h00m\d\d\.webm$/,
  );
  expect(file.text).toBe("son-0;son-1;son-2;");
  // le journal vocal a été activé, et note le début et la fin du fichier
  await app.$("#captureClose").click();
  await app.$("#settingsBtn").click();
  await expect(app.$("#journalOn")).toHaveValue("1");
  await expect(app.$("#journalCount")).toHaveText("2 phrases notées");
  await app.$("#journalExport").click();
  await expect.poll(() => app.shared()).toHaveLength(2);
  const { journal } = JSON.parse((await app.shared())[1].text);
  expect(
    journal
      .filter((e) => e.event?.startsWith("capture"))
      .map((e) => [e.event, e.detail]),
  ).toEqual([
    ["capture-start", file.name],
    ["capture-stop", file.name],
  ]);
});

test("les fichiers restent après un rechargement, et s'effacent en deux appuis", async ({
  app,
  page,
}) => {
  await openCapture(app);
  await app.$("#captureToggle").click();
  await app.wait(6000);
  await page.reload();
  await openCapture(app);
  await expect(app.$("#captureStatus")).toHaveText("Captation arrêtée");
  const row = app.$("#captureList .capture-row");
  await expect(row).toHaveCount(1);
  // une page rechargée ne perd que le dernier morceau
  await app.$("#captureExportAll").click();
  await expect.poll(() => app.shared()).toHaveLength(1);
  expect((await app.shared())[0].text).toBe("son-0;");
  await row.locator("[data-remove]").click();
  await expect(row.locator("[data-remove]")).toHaveText("Confirmer ?");
  await row.locator("[data-remove]").click();
  await expect(app.$("#captureList")).toHaveText("Aucun fichier.");
});

test("tout exporter : tous les fichiers d'un coup", async ({ app }) => {
  await openCapture(app);
  for (let i = 0; i < 2; i++) {
    await app.$("#captureToggle").click();
    await expect(app.$("#captureBtn")).toBeVisible();
    await app.wait(5500);
    await app.$("#captureToggle").click();
    await expect(app.$("#captureBtn")).toBeHidden();
    await app.wait(1000);
  }
  await expect(app.$("#captureList .capture-row")).toHaveCount(2);
  await app.$("#captureExportAll").click();
  await expect.poll(() => app.shared()).toHaveLength(2);
});

test("le micro coupé par le téléphone termine le fichier", async ({
  app,
  page,
}) => {
  await openCapture(app);
  await app.$("#captureToggle").click();
  await expect(app.$("#captureBtn")).toBeVisible();
  await page.evaluate(() => window.__micTrack.end());
  await app.wait(1000);
  await expect(app.$("#captureBtn")).toBeHidden();
  await expect(app.$("#captureStatus")).toHaveText("Captation arrêtée");
  await expect(app.$("#captureList .capture-row")).toHaveCount(1);
});

test("micro refusé : le motif s'affiche, rien ne démarre", async ({
  app,
  page,
}) => {
  await page.evaluate(() => (window.__micError = "NotAllowedError"));
  await openCapture(app);
  await app.$("#captureToggle").click();
  await expect(app.$("#captureError")).toHaveText(
    "Accès au micro refusé : autorisez-le dans les réglages du navigateur.",
  );
  await expect(app.$("#captureBtn")).toBeHidden();
  await expect(app.$("#captureToggle")).toHaveText("Démarrer la captation");
  await page.evaluate(() => (window.__micError = "AbortError"));
  await app.$("#captureToggle").click();
  await expect(app.$("#captureError")).toHaveText(
    "Captation impossible (AbortError).",
  );
});

test("export refusé par le téléphone : le téléchargement prend le relais", async ({
  app,
  page,
}) => {
  await openCapture(app);
  await app.$("#captureToggle").click();
  await app.wait(5500);
  await app.$("#captureToggle").click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", { value: () => false }),
  );
  const download = page.waitForEvent("download");
  await app.$("#captureList [data-export]").click();
  expect((await download).suggestedFilename()).toMatch(
    /^chrono-canne-captation-.*\.webm$/,
  );
});

test.describe("navigateur sans enregistreur", () => {
  test("la fenêtre le dit, le bouton est désactivé", async ({ app, page }) => {
    // après les doublures de la page : rechargée sans enregistreur
    await page.addInitScript(() => {
      delete window.MediaRecorder;
    });
    await page.reload();
    await openCapture(app);
    await expect(app.$("#captureStatus")).toHaveText(
      "La captation audio n'est pas possible sur ce navigateur.",
    );
    await expect(app.$("#captureToggle")).toBeDisabled();
  });
});

// Le témoin s'ajoute sous le chrono, pour tout le stage : rien ne déborde, même dans les formats les plus bas, et même
// avec le témoin « micro silencieux »
for (const [name, size] of Object.entries({
  "iPhone SE portrait": { width: 320, height: 568 },
  "petit Android portrait, barre du navigateur": { width: 360, height: 560 },
  "iPhone SE paysage": { width: 667, height: 375 },
  "iPhone paysage, barres Safari": { width: 844, height: 280 },
})) {
  test(`${name} : le témoin tient à l'écran, sans défilement`, async ({
    app,
    page,
  }) => {
    await page.setViewportSize(size);
    await app.addStyle("html, body { font-size: 20px }");
    await openCapture(app);
    await app.$("#captureToggle").click();
    await app.$("#captureClose").click();
    await app.wait(10 * 60_000 + 2000); // 10:02 : un fichier ne dépasse pas 30 minutes
    await expect(app.$("#captureTime")).toHaveText("10:02");
    for (const sel of ["#captureBtn", "#time", "#mainBtn", ".bar", "header"])
      await expect(page.locator(sel)).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () =>
          document.scrollingElement.scrollHeight <= innerHeight + 1 &&
          document.scrollingElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const time = await app.time.boundingBox(),
      badge = await app.$("#captureBtn").boundingBox(),
      controls = await page.locator(".controls").boundingBox();
    expect(badge.y).toBeGreaterThanOrEqual(time.y + time.height - 1);
    if (controls.y > time.y)
      expect(badge.y + badge.height).toBeLessThanOrEqual(controls.y + 1);
  });
}
