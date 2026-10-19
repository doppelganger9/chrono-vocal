// Remettre un fichier (journal vocal, réglages) : feuille de partage du téléphone, sinon téléchargement (#94)
const { test, expect } = require("./fixtures");

/** Remplace le partage du téléphone simulé par les fixtures @param {import("@playwright/test").Page} page @param {string} mode */
const sharing = (page, mode) =>
  page.evaluate((mode) => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => mode !== "sans-fichiers",
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        window.__shareCalls = (window.__shareCalls || 0) + 1;
        if (mode === "refus")
          throw new DOMException("refusé", "NotAllowedError");
        if (mode === "annulé") throw new DOMException("annulé", "AbortError");
      },
    });
  }, mode);

/** @param {import("@playwright/test").Page} page */
async function exportJournal(page) {
  await page.locator("#settingsBtn").click();
  await page.locator("#journalExport").click();
}

for (const [mode, why] of [
  ["refus", "le partage échoue (Samsung Internet, Android)"],
  ["sans-fichiers", "le téléphone ne partage pas ce type de fichier"],
]) {
  test(`${why} : le journal est téléchargé`, async ({ app, page }) => {
    await sharing(page, mode);
    await app.hear("Stop");
    const download = page.waitForEvent("download");
    await exportJournal(page);
    expect((await download).suggestedFilename()).toBe(
      "chrono-canne-journal-vocal.json",
    );
  });
}

test("partage annulé par l'arbitre : pas de téléchargement en plus", async ({
  app,
  page,
}) => {
  await sharing(page, "annulé");
  await app.hear("Stop");
  let downloads = 0;
  page.on("download", () => downloads++);
  await exportJournal(page);
  await expect.poll(() => page.evaluate(() => window.__shareCalls)).toBe(1);
  await page.waitForTimeout(300);
  expect(downloads).toBe(0);
});
