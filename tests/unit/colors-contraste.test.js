// Contrastes des thèmes (#38) : les mêmes seuils qu'axe-core dans les tests de bout en bout (tests/e2e/accessibilite.spec.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { THEMES, contrastRatio } from "../../js/colors.js";

// opacité au creux du battement des chiffres en arrêt (css/app.css)
const css = fs.readFileSync(
  new URL("../../css/app.css", import.meta.url),
  "utf8",
);
const pulse = Number(
  css.match(/@keyframes pulse-time\s*\{\s*50%\s*\{\s*opacity:\s*([\d.]+)/)?.[1],
);

for (const [name, t] of Object.entries(THEMES)) {
  test(`${name} : texte des boutons bleus lisible (4,5:1)`, () => {
    const r = contrastRatio(t["on-color"], t.accent);
    assert.ok(r >= 4.5, `${t["on-color"]} sur ${t.accent} : ${r}`);
  });
  test(`${name} : chiffres de l'arrêt lisibles même au creux du battement (3:1)`, () => {
    const a = pulse;
    assert.ok(
      a > 0 && a <= 1,
      "animation pulse-time introuvable dans css/app.css",
    );
    const mix =
      "#" +
      [1, 3, 5]
        .map((i) =>
          Math.round(
            parseInt(t.stop.slice(i, i + 2), 16) * a +
              parseInt(t.bg.slice(i, i + 2), 16) * (1 - a),
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    const r = contrastRatio(mix, t.bg);
    assert.ok(r >= 3, `${mix} sur ${t.bg} : ${r}`);
  });
}
