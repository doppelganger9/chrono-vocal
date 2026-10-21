// Journal vocal et vie privée (#87) : désactivé par défaut, activé à la main, avertissement avant le partage
const { test, expect } = require("./fixtures");

const stored = (app) =>
  app.page.evaluate(() =>
    JSON.parse(localStorage.getItem("chrono-canne-journal") || "[]"),
  );

test("désactivé par défaut : aucune phrase notée tant que l'arbitre ne l'active pas", async ({
  app,
  page,
}) => {
  await app.hear("Allez");
  await app.$("#settingsBtn").click();
  await expect(page.locator("#journalOn")).toHaveValue("0");
  await expect(page.locator("#journalCount")).toHaveText("Aucune phrase notée");
  await expect(page.locator("#journalWarn")).toHaveText("");
  expect((await stored(app)).some((e) => e.alts)).toBe(false);

  await page.locator("#journalOn").selectOption("1");
  await page.keyboard.press("Escape");
  await app.hear("Stop");
  await app.$("#settingsBtn").click();
  await expect(page.locator("#journalCount")).toHaveText("1 phrase notée");
  await expect(page.locator("#journalWarn")).toHaveText(
    "Le journal peut contenir des conversations entendues autour de l'aire : relisez-le avant de le partager.",
  );
  await page.reload();
  await app.$("#settingsBtn").click();
  await expect(page.locator("#journalOn")).toHaveValue("1");
});

test("migration : un journal existant est gardé une semaine, et le réglage part désactivé", async ({
  app,
  page,
}) => {
  const now = await page.evaluate(() => Date.now());
  const day = 24 * 3600 * 1000;
  await page.evaluate(
    ([now, day]) =>
      localStorage.setItem(
        "chrono-canne-journal",
        JSON.stringify([
          {
            t: now - 8 * day,
            alts: ["vieille"],
            final: true,
            phase: "ready",
            action: "non reconnu",
          },
          {
            t: now - day,
            alts: ["récente"],
            final: true,
            phase: "ready",
            action: "non reconnu",
          },
        ]),
      ),
    [now, day],
  );
  await page.reload();
  await app.$("#settingsBtn").click();
  await expect(page.locator("#journalOn")).toHaveValue("0");
  await expect(page.locator("#journalCount")).toHaveText("1 phrase notée");
  expect((await stored(app)).map((e) => e.alts?.[0])).toEqual(["récente"]);
});
