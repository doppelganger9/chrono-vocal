// Journal vocal (#3) : ce que la reconnaissance a entendu en salle, et ce que l'app en a fait
const { test, expect } = require("./fixtures");

test.describe("journal activé", () => {
  test.use({ journalOn: true });

  test("les phrases entendues sont notées, exportables et effaçables", async ({
    app,
    page,
  }) => {
    await app.hear("à les");
    await app.hear("Allô");
    await app.hear("Stop");
    await app.$("#settingsBtn").click();
    await expect(page.locator("#journalCount")).toHaveText("3 phrases notées");
    await page.locator("#journalExport").click();
    await expect.poll(() => app.shared()).toHaveLength(1);
    const [file] = await app.shared();
    expect(file.name).toBe("chrono-canne-journal-vocal.json");
    const { journal } = JSON.parse(file.text);
    expect(
      journal.filter((e) => e.alts).map((e) => [e.alts[0], e.action, e.phase]),
    ).toEqual([
      ["à les", "ALLEZ", "ready"],
      ["Allô", "non reconnu", "round"],
      ["Stop", "STOP", "round"],
    ]);
    await page.locator("#journalClear").click();
    await expect(page.locator("#journalClear")).toHaveText("Confirmer ?");
    await page.locator("#journalClear").click();
    await expect(page.locator("#journalCount")).toHaveText(
      "Aucune phrase notée",
    );
  });
});
