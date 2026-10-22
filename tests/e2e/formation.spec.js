// Mode formation (#106) : l'aide-mémoire du protocole suit le chrono, sans rien imposer (ADR 0006)
const { test, expect } = require("./fixtures");

const card = (app) => app.$("#formation");
const say = (app) => app.$("#formationSay");
const when = (app) => app.$("#formationWhen");

test("désactivé par défaut : le chrono normal ne change pas", async ({
  app,
}) => {
  await expect(card(app)).toBeHidden();
  await app.$("#settingsBtn").click();
  await expect(app.$("#sFormation")).toHaveValue("0");
});

test("avant l'assaut : les étapes du protocole, d'un toucher à l'autre", async ({
  app,
}) => {
  await app.configure({ sFormation: "1" });
  await expect(card(app)).toBeVisible();
  await expect(when(app)).toHaveText("Appel · 1/9");
  await expect(say(app)).toContainText("Sont attendus sur l'aire");
  await expect(say(app).locator(".f-usage")).toHaveText("usage");
  await expect(app.$("#formationThen")).toHaveText(
    "Ensuite (arbitre) : « Tireurs, vérification du matériel »",
  );
  await expect(app.$("#formationPrev")).toBeDisabled();
  await app.$("#formationNext").click();
  await app.$("#formationNext").click();
  await expect(when(app)).toHaveText("Arbitre · 3/9");
  await expect(say(app)).toHaveText("« Tireurs, au centre »");
  await expect(say(app).locator(".f-usage")).toHaveCount(0); // phrase du cahier
  await app.$("#formationPrev").click();
  await expect(when(app)).toHaveText("Arbitre · 2/9");
  for (let i = 0; i < 7; i++) await app.$("#formationNext").click();
  await expect(when(app)).toHaveText("Arbitre · 9/9");
  await expect(say(app)).toHaveText("« En garde » « Allez »");
  await expect(app.$("#formationNext")).toBeDisabled();
  await expect(app.phase).toHaveText("Prêt — en garde"); // rien n'a bougé dans le chrono
});

test("pendant l'assaut : l'aide-mémoire suit le chrono, et les commandes marchent comme d'habitude", async ({
  app,
}) => {
  await app.configure({ sFormation: "1", sRound: "0:05", sRounds: 2 });
  await app.$("#formationNext").click(); // l'arbitre n'a pas fini le protocole d'avant : rien n'est imposé
  await app.hear("Allez");
  await expect(app.phase).toHaveText("Assaut");
  await expect(app.$("#formationPrev")).toBeHidden();
  await expect(when(app)).toHaveText("Pour arrêter");
  await expect(say(app)).toHaveText("« Stop »");
  await app.hear("Stop");
  await expect(when(app)).toHaveText("Arrêt");
  await expect(say(app)).toHaveText("« En garde » « Allez »");
  await app.hear("Allez");
  await app.wait(6000);
  await expect(app.phase).toHaveText("Temps dépassé");
  await expect(say(app)).toHaveText("« Stop, fin de la reprise »");
  await app.hear("Stop, fin de la reprise");
  await expect(app.phase).toHaveText("Minute de repos");
  await expect(when(app)).toHaveText("Repos");
  await expect(app.$("#formationThen")).toHaveText(
    "Ensuite (à 30 s) : « Tireurs, équipez-vous »",
  );
  await app.wait(30_500);
  await expect(when(app)).toHaveText("30 s");
  await expect(say(app)).toHaveText("« Tireurs, équipez-vous »");
  await expect(app.stops).toHaveText(""); // le sous-titre du repos laisse la place à la carte
  await app.wait(25_000);
  await expect(when(app)).toHaveText("5 s");
  await expect(say(app)).toContainText("« Deuxième reprise » usage");
  await expect(say(app)).toContainText("« Chrono, prêt ? »");
});

test("fin de l'assaut : les résultats, puis l'assaut réinitialisé repart de l'appel", async ({
  app,
}) => {
  await app.configure({ sFormation: "1", sRound: "0:05", sRounds: 1 });
  await app.hear("Allez");
  await app.wait(5700);
  await expect(say(app)).toHaveText("« Stop, fin de l'assaut »");
  await app.hear("Stop, fin de l'assaut");
  await app.wait(1600); // les statistiques s'ouvrent
  await app.$("#closeStats").click();
  await expect(when(app)).toHaveText("Arbitre · 1/5");
  await expect(say(app)).toContainText("« Saluez-vous »");
  await app.$("#formationNext").click();
  await app.$("#formationNext").click();
  await expect(say(app)).toHaveText("« Tireurs au centre, résultats »");
  await app.$("#resetBtn").click();
  await app.$("#resetBtn").click();
  await expect(when(app)).toHaveText("Appel · 1/9");
});

// Formats d'écran et police large (CONTRIBUTING § 2, règle 13) : la carte tient avec le chrono, sans défilement
const SIZES = {
  "iPhone SE portrait": { width: 375, height: 667 },
  "iPhone SE paysage": { width: 667, height: 375 },
  "iPhone Pro Max portrait": { width: 430, height: 932 },
  "Android paysage": { width: 915, height: 412 },
  "iPhone paysage, barres Safari": { width: 844, height: 280 },
  "iPhone portrait, barres Safari": { width: 390, height: 560 },
  "Galaxy S7 portrait, barre du navigateur": { width: 360, height: 560 },
  "écran large": { width: 1440, height: 800 },
};
const box = (page, sel) => page.locator(sel).boundingBox();
const noScroll = (page) =>
  page.evaluate(
    () =>
      document.scrollingElement.scrollHeight <= innerHeight + 1 &&
      document.scrollingElement.scrollWidth <= innerWidth + 1,
  );
for (const [name, size] of Object.entries(SIZES)) {
  test(`${name} : la carte tient avec le chrono, police large comprise`, async ({
    app,
    page,
  }) => {
    await page.setViewportSize(size);
    await app.addStyle(
      'html, body { font-family: Verdana, "DejaVu Sans", sans-serif !important; }',
    );
    await app.configure({ sFormation: "1", sRound: "0:05" });
    const visible = async () => {
      expect(await noScroll(page)).toBe(true);
      for (const sel of ["#time", "#mainBtn", "#formationSay", ".bar"])
        await expect(page.locator(sel)).toBeInViewport();
      const header = await box(page, "header"),
        label = await box(page, "#roundLabel"),
        heard = await box(page, "#heard"),
        controls = await box(page, ".controls");
      expect(
        label.y,
        "l'en-tête ne recouvre pas « Reprise »",
      ).toBeGreaterThanOrEqual(header.y + header.height - 1);
      if (controls.y > label.y)
        // en portrait, les boutons sont sous le chrono
        expect(
          heard.y + heard.height,
          "la carte et le message entendu restent au-dessus des boutons",
        ).toBeLessThanOrEqual(controls.y + 1);
    };
    for (let i = 0; i < 7; i++) await app.$("#formationNext").click(); // les quatre officiels
    await visible();
    await app.hear("Allez");
    await app.wait(5700);
    await app.hear("Stop, fin de la reprise");
    await app.wait(56_000); // à 5 s de la fin : l'étape la plus longue du repos, avec les rappels
    await expect(app.$("#rappels")).toBeVisible();
    await expect(say(app)).toContainText("Chrono, prêt ?");
    await visible();
  });
}
