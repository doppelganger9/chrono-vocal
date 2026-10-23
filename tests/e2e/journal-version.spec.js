// Journal vocal exporté (#112) : version de l'app, date de l'export, navigateur, et version à chaque début d'écoute
const { test, expect } = require("./fixtures");
const { version } = require("../../package.json");

test.use({ journalOn: true });

test("l'export dit avec quelle version et quel navigateur il a été fait", async ({
  app,
  page,
}) => {
  await app.hear("à les");
  await app.$("#settingsBtn").click();
  await page.locator("#journalExport").click();
  await expect.poll(() => app.shared()).toHaveLength(1);
  const [file] = await app.shared();
  const data = JSON.parse(file.text);
  expect(data.version).toBe(version);
  expect(data.userAgent).toBe(await page.evaluate(() => navigator.userAgent));
  expect(new Date(data.exported).toISOString()).toBe(data.exported);
  const starts = data.journal.filter((e) => e.event === "start");
  expect(starts.length).toBeGreaterThan(0);
  for (const s of starts) expect(s.v).toBe(version);
});
