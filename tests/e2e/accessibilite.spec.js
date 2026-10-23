// Accessibilité testée par axe-core (#38) : aucune violation « serious » ou « critical »,
// sur chaque écran, dans les thèmes jour et nuit.
const { test, expect } = require("./fixtures");
const { default: AxeBuilder } = require("@axe-core/playwright");

/** Violations graves de la page telle qu'elle est affichée, résumées pour un message lisible.
 * AXE_DETAIL=1 ajoute le détail (contraste mesuré, couleurs…) */
async function violations(page) {
  await page.clock.resume(); // axe attend ses propres minuteries : l'horloge simulée, en pause, les bloquerait
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(" ") + (process.env.AXE_DETAIL ? " " + n.failureSummary : "")).join(", ")}`,
    );
}

const SCREENS = {
  "écran principal": async () => {},
  "assaut en cours": async (app) => {
    await app.hear("Allez");
    await app.wait(3000);
  },
  arrêt: async (app) => {
    await app.hear("Allez");
    await app.wait(3000);
    await app.hear("Stop");
  },
  "minute de repos et rappels": async (app) => {
    await app.configure({ sRound: "0:05" });
    await app.hear("Allez");
    await app.wait(5500);
    await app.$("#skipBtn").click();
    await app.wait(1500);
  },
  // mode formation (#106) : l'aide-mémoire, avant l'assaut (phrase d'usage marquée) puis pendant le repos
  "mode formation": async (app) => {
    await app.configure({ sFormation: "1", sRound: "0:05" });
    await app.$("#formationNext").click();
  },
  "mode formation, repos": async (app) => {
    await app.configure({ sFormation: "1", sRound: "0:05" });
    await app.hear("Allez");
    await app.wait(5500);
    await app.$("#skipBtn").click();
    await app.wait(46_000);
  },
  // pendant un arrêt : la liste des cas, et un script avec « ou »
  "mode formation, arrêt": async (app) => {
    await app.configure({ sFormation: "1" });
    await app.hear("Allez");
    await app.hear("Stop");
    await app.$("#formationCase").selectOption("Décision des juges");
  },
  // le bouton seul, affiché à la main : la version téléchargée est simulée dans mise-a-jour.spec.js (#96)
  "mise à jour disponible": async (app) => {
    await app.$("#updateBtn").evaluate((b) => (b.hidden = false));
  },
  réglages: async (app) => {
    await app.$("#settingsBtn").click();
  },
  // une page à part (#86) ; le thème vient du téléphone, comme dans l'app (« automatique »)
  "mentions légales et confidentialité": async (app) => {
    await app.page.goto("/mentions-legales.html");
  },
  statistiques: async (app) => {
    await app.hear("Allez");
    await app.wait(3000);
    await app.hear("Stop");
    await app.hear("Pénalité pour sortie d'aire, tireur bleu");
    await app.$("#statsBtn").click();
  },
  "chronomètre annexe": async (app) => {
    await app.$("#annexBtn").click();
  },
  "chronomètre annexe, second exclu": async (app) => {
    await app.$("#annexBtn").click();
    await app.$("#annexSecond").click();
    await app.$('#annexTireurs button[data-color="bleu"]').click();
  },
};

for (const scheme of ["light", "dark"]) {
  test.describe(scheme === "light" ? "thème jour" : "thème nuit", () => {
    test.use({ colorScheme: scheme });
    for (const [name, open] of Object.entries(SCREENS)) {
      test(name, async ({ app, page }) => {
        await open(app);
        expect(await violations(page)).toEqual([]);
      });
    }
    test.describe("écran titre", () => {
      test.use({ introSeen: false });
      test("premier lancement", async ({ app, page }) => {
        await expect(page.locator("#intro")).toBeVisible();
        expect(await violations(page)).toEqual([]);
      });
    });
  });
}

test("au clavier : Tab atteint un bouton, Entrée l'active, Échap ferme la fenêtre", async ({
  app,
  page,
}) => {
  // les boutons de l'en-tête, dans l'ordre de la page (le micro, allumé d'un clic par la fixture, a déjà le focus)
  await expect(app.$("#micBtn")).toBeFocused();
  const order = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => document.activeElement?.id));
  }
  expect(order).toEqual(["annexBtn", "statsBtn", "announceBtn", "settingsBtn"]);
  await expect(app.$("#settingsBtn")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(app.$("#settings")).toBeVisible();
  await expect(app.phase).toHaveText("Prêt — en garde"); // la touche n'a pas lancé le chrono
  await page.keyboard.press("Escape");
  await expect(app.$("#settings")).toBeHidden();
  await expect(app.$("#settingsBtn")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(app.$("#settings")).toBeVisible();
});

test("télécommande : après un toucher sur un bouton de l'en-tête, Entrée reste le bouton principal", async ({
  app,
}) => {
  await app.$("#statsBtn").click();
  await app.$("#closeStats").click();
  await app.page.keyboard.press("Enter");
  await expect(app.phase).toHaveText("Assaut");
});
