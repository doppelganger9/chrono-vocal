// Couleurs, thèmes et contraste (js/colors.js) — #5
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  THEMES,
  PALETTE_KEYS,
  contrastRatio,
  contrastWarnings,
  resolveTheme,
  effectivePalette,
  tireurColor,
  MIN_CONTRAST,
} from "../../js/colors.js";

test("contraste : rapport WCAG entre deux couleurs", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#000"), 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
  assert.ok(Math.abs(contrastRatio("#767676", "#ffffff") - 4.54) < 0.01);
});

test("thème automatique : suit le réglage du téléphone", () => {
  assert.equal(resolveTheme("auto", true), "jour");
  assert.equal(resolveTheme("auto", false), "nuit");
  assert.equal(resolveTheme("nuit", true), "nuit");
  assert.equal(resolveTheme("jour", false), "jour");
});

test("palette effective : couleurs du thème, remplacées par les couleurs personnalisées", () => {
  assert.deepEqual(effectivePalette("nuit", {}), {
    round: THEMES.nuit.round,
    rest: THEMES.nuit.rest,
    stop: THEMES.nuit.stop,
    over: THEMES.nuit.over,
  });
  assert.equal(effectivePalette("jour", { round: "#123456" }).round, "#123456");
  assert.equal(
    effectivePalette("jour", { round: "#123456" }).rest,
    THEMES.jour.rest,
  );
});

test("les couleurs d'origine de chaque thème sont lisibles sur son fond", () => {
  for (const name of /** @type {const} */ (["nuit", "jour"])) {
    for (const k of PALETTE_KEYS) {
      assert.ok(
        contrastRatio(THEMES[name][k], THEMES[name].bg) >= MIN_CONTRAST,
        `${name}.${k}`,
      );
    }
    assert.ok(
      contrastRatio(THEMES[name].text, THEMES[name].bg) >= 7,
      `${name}.text`,
    );
  }
});

test("avertissement si une couleur personnalisée est peu lisible sur le fond", () => {
  assert.deepEqual(contrastWarnings("nuit", {}), []);
  const w = contrastWarnings("nuit", { round: "#202020" });
  assert.equal(w.length, 1);
  assert.equal(w[0].key, "round");
  assert.ok(w[0].ratio < MIN_CONTRAST);
});

test("css/themes.css et js/colors.js décrivent les mêmes couleurs", () => {
  const css = fs.readFileSync(
    new URL("../../css/themes.css", import.meta.url),
    "utf8",
  );
  for (const [name, colors] of Object.entries(THEMES)) {
    const block =
      css.match(
        new RegExp(`:root\\[data-theme="${name}"\\][^{]*\\{([^}]*)\\}`),
      )?.[1] ?? "";
    for (const [k, v] of Object.entries(colors)) {
      assert.match(
        block,
        new RegExp(`--${k}:\\s*${v};`, "i"),
        `${name} --${k}`,
      );
    }
  }
});

test("couleur des tireurs : nom → pastille, sinon neutre", () => {
  assert.equal(tireurColor("rouge"), "#e5484d");
  assert.equal(tireurColor("Bleu"), "#3b82f6");
  assert.equal(tireurColor("violet"), null);
  assert.equal(tireurColor(null), null);
});
