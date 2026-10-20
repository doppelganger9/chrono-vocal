// Une copie ou un partage qui échoue se voit à l'écran, au lieu d'un bouton sans effet (#98)
const { test, expect } = require("./fixtures");

/** Presse-papiers et partage du téléphone simulés @param {import("@playwright/test").Page} page @param {{ copie: boolean, partage: "ok" | "refus" | "annulé" | "absent" }} o */
const environnement = (page, o) =>
  page.evaluate((o) => {
    window.__copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (/** @type {string} */ t) => {
          if (!o.copie) throw new DOMException("refusé", "NotAllowedError");
          window.__copied.push(t);
        },
      },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value:
        o.partage === "absent"
          ? undefined
          : async () => {
              if (o.partage === "refus")
                throw new DOMException("refusé", "NotAllowedError");
              if (o.partage === "annulé")
                throw new DOMException("annulé", "AbortError");
            },
    });
  }, o);

test.describe("lien de partage des réglages", () => {
  test("copie refusée : le lien reste sélectionné, et le bouton dit de le copier", async ({
    app,
    page,
  }) => {
    await environnement(page, { copie: false, partage: "ok" });
    await app.$("#settingsBtn").click();
    await app.$("#shareLink").click();
    await expect(app.$("#shareLink")).toHaveText("Copiez le lien ci-dessus");
    await expect(page.locator("#shareUrl")).toBeVisible();
    await expect(page.locator("#shareUrl")).toHaveValue(/#reglages=/);
  });

  test("copie réussie : « Lien copié ✓ »", async ({ app, page }) => {
    await environnement(page, { copie: true, partage: "ok" });
    await app.$("#settingsBtn").click();
    await app.$("#shareLink").click();
    await expect(app.$("#shareLink")).toHaveText("Lien copié ✓");
    expect(await page.evaluate(() => window.__copied[0])).toMatch(/#reglages=/);
  });
});

test.describe("partage des statistiques", () => {
  /** @param {import("./fixtures").App} app */
  async function partager(app) {
    await app.hear("Allez");
    await app.wait(1000);
    await app.$("#statsBtn").click();
    await app.$("#shareStats").click();
  }

  for (const partage of /** @type {const} */ (["refus", "absent"])) {
    test(`partage ${partage === "refus" ? "refusé" : "absent"} et copie refusée : « Échec du partage », puis le bouton revient`, async ({
      app,
      page,
    }) => {
      await environnement(page, { copie: false, partage });
      await partager(app);
      await expect(app.$("#shareStats")).toHaveText("Échec du partage");
      await app.wait(2500);
      await expect(app.$("#shareStats")).toHaveText("Partager");
    });
  }

  test("partage refusé : le texte est copié à la place", async ({
    app,
    page,
  }) => {
    await environnement(page, { copie: true, partage: "refus" });
    await partager(app);
    await expect(app.$("#shareStats")).toHaveText("Copié ✓");
    expect(await page.evaluate(() => window.__copied.length)).toBe(1);
  });

  test("partage annulé par l'arbitre : rien à signaler", async ({
    app,
    page,
  }) => {
    await environnement(page, { copie: true, partage: "annulé" });
    await partager(app);
    await page.waitForTimeout(300);
    await expect(app.$("#shareStats")).toHaveText("Partager");
    expect(await page.evaluate(() => window.__copied.length)).toBe(0);
  });
});
