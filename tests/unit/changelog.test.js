// Notes de version lues dans CHANGELOG.md (js/changelog.js) — #84
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChangelog } from "../../js/changelog.js";

const MD = `# Journal des changements

Texte d'introduction.

- une liste hors version, ignorée

## [1.2.0] · 2026-10-20

- Ligne **en gras** et \`code\` (#84).
- Deux issues (#3, #56) et une troisième (#7)

## [1.0.0] · 2026-10-19

Première version numérotée.

### Le chrono

- Reprises
- Minute de repos

### Vide

### La voix

- Commandes
`;

test("chaque version, ses rubriques et ses lignes, sans numéros d'issue ni Markdown", () => {
  assert.deepEqual(parseChangelog(MD), [
    {
      version: "1.2.0",
      date: "2026-10-20",
      sections: [
        {
          title: "",
          items: ["Ligne en gras et code.", "Deux issues et une troisième"],
        },
      ],
    },
    {
      version: "1.0.0",
      date: "2026-10-19",
      sections: [
        { title: "Le chrono", items: ["Reprises", "Minute de repos"] },
        { title: "La voix", items: ["Commandes"] },
      ],
    },
  ]);
});

test("journal vide ou sans version : aucune note", () => {
  assert.deepEqual(parseChangelog(""), []);
  assert.deepEqual(parseChangelog("# Titre\n\n- ligne\n### Rubrique\n"), []);
});

test("seules les lignes « - » au début comptent", () => {
  const [r] = parseChangelog(
    "## [1.0.0] · 2026-10-19\n  - indentée\n-collée\n- vraie\n",
  );
  assert.deepEqual(r.sections, [{ title: "", items: ["vraie"] }]);
});

test("un « (#…) » qui n'est pas une liste d'issues reste", () => {
  const [r] = parseChangelog(
    "## [1.0.0] · 2026-10-19\n- Couleur (#fff) et (# 3) et (#3 et #4)\n",
  );
  assert.deepEqual(r.sections[0].items, [
    "Couleur (#fff) et (# 3) et (#3 et #4)",
  ]);
});
