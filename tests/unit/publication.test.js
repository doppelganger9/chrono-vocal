// Version et notes de version calculées à la fusion (#91) : scripts/lib/publication.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const P = require("../../scripts/lib/publication.js");

const note = (/** @type {string} */ type, /** @type {string[]} */ lines) =>
  `---\ntype: ${type}\n---\n\n${lines.join("\n")}\n`;

const CHANGELOG = `# Journal des changements

Introduction.

## [1.3.2] · 2026-10-19

- Ancienne ligne (#79).
`;

test("une note : son type et ses lignes", () => {
  assert.deepEqual(P.parseNote("91.md", note("correctif", ["- Une (#91)."])), {
    type: "correctif",
    lines: ["- Une (#91)."],
  });
  assert.deepEqual(
    P.parseNote(
      "7.md",
      "---\r\ntype:  nouveauté \r\n---\r\n- A\r\n\r\n-   B  \r\n",
    ),
    { type: "nouveauté", lines: ["- A", "-   B"] },
  );
});

test("une note invalide est refusée, avec le nom du fichier et la raison", () => {
  const refus = (/** @type {string} */ text, /** @type {RegExp} */ why) =>
    assert.throws(
      () => P.parseNote("12.md", text),
      (/** @type {Error} */ e) =>
        e.message.startsWith("changements/12.md : ") && why.test(e.message),
    );
  refus("- Sans en-tête\n", /en-tête/);
  refus("---\ntype: correctif\n- pas de fin d'en-tête\n", /en-tête/);
  refus("x---\ntype: correctif\n---\n- A\n", /en-tête/);
  refus("---\ntitre: correctif\n---\n- A\n", /en-tête/);
  refus("---\ntype: majeure\n---\n- A\n", /« majeure »/);
  refus("---\ntype: correctif\nautre: x\n---\n- A\n", /en-tête/);
  refus("---\ntype: correctif\n---\n\n", /aucune ligne/);
  refus("---\ntype: correctif\n---\n- A\nTexte libre\n", /« Texte libre »/);
  refus("---\ntype: correctif\n---\n-collée\n", /« -collée »/);
  refus("---\ntype: correctif\n---\n- \n", /« - »/);
  refus("---\ntype: correctif\n---\n## [9.9.9] · 2026-01-01\n- A\n", /« ## /);
});

test("version suivante : mineure s'il y a une nouveauté, correctif sinon, rien sans note", () => {
  const c = { type: "correctif", lines: ["- c"] };
  const n = { type: "nouveauté", lines: ["- n"] };
  assert.equal(P.nextVersion("1.3.2", [c]), "1.3.3");
  assert.equal(P.nextVersion("1.3.2", [c, c]), "1.3.3");
  assert.equal(P.nextVersion("1.3.2", [n]), "1.4.0");
  assert.equal(P.nextVersion("1.3.2", [c, n, c]), "1.4.0");
  assert.equal(P.nextVersion("2.19.9", [c]), "2.19.10");
  assert.equal(P.nextVersion("2.19.9", [n]), "2.20.0");
  assert.equal(P.nextVersion("1.3.2", []), null);
  assert.throws(() => P.nextVersion("1.3", [c]), /« 1\.3 »/);
  assert.throws(() => P.nextVersion("1.3.2-beta", [c]), /SemVer/);
});

test("correctif seul : nouvelle version en tête du journal, après l'introduction", () => {
  const r = P.publish({
    version: "1.3.2",
    changelog: CHANGELOG,
    date: "2026-10-20",
    notes: [{ name: "91.md", text: note("correctif", ["- Corrigé (#91)."]) }],
  });
  assert.deepEqual(r, {
    version: "1.3.3",
    changelog: `# Journal des changements

Introduction.

## [1.3.3] · 2026-10-20

- Corrigé (#91).

## [1.3.2] · 2026-10-19

- Ancienne ligne (#79).
`,
  });
});

test("plusieurs notes de plusieurs PR : une seule version, nouveautés d'abord, dans l'ordre des issues", () => {
  const r = P.publish({
    version: "1.3.2",
    changelog: CHANGELOG,
    date: "2026-10-21",
    notes: [
      { name: "100.md", text: note("correctif", ["- C100"]) },
      { name: "9.md", text: note("correctif", ["- C9", "- C9 bis"]) },
      { name: "20.md", text: note("nouveauté", ["- N20"]) },
      { name: "3.md", text: note("nouveauté", ["- N3"]) },
    ],
  });
  assert.equal(r?.version, "1.4.0");
  assert.equal(
    r?.changelog.split("## [1.3.2]")[0],
    `# Journal des changements

Introduction.

## [1.4.0] · 2026-10-21

- N3
- N20
- C9
- C9 bis
- C100

`,
  );
});

test("aucune note : rien à publier", () => {
  assert.equal(
    P.publish({ version: "1.3.2", changelog: CHANGELOG, date: "x", notes: [] }),
    null,
  );
});

test("une note invalide arrête la publication", () => {
  assert.throws(
    () =>
      P.publish({
        version: "1.3.2",
        changelog: CHANGELOG,
        date: "2026-10-20",
        notes: [
          { name: "1.md", text: note("correctif", ["- ok"]) },
          { name: "2.md", text: "- sans en-tête\n" },
        ],
      }),
    /changements\/2\.md/,
  );
});

test("journal sans version : la première s'ajoute à la fin", () => {
  assert.equal(
    P.addRelease("# Journal\n\nIntro.\n", "1.0.0", "2026-10-20", ["- A"]),
    "# Journal\n\nIntro.\n\n## [1.0.0] · 2026-10-20\n\n- A\n",
  );
  assert.equal(
    P.addRelease("# Journal", "1.0.0", "2026-10-20", ["- A"]),
    "# Journal\n\n## [1.0.0] · 2026-10-20\n\n- A\n",
  );
});

test("seul un titre de version en début de ligne compte", () => {
  assert.equal(
    P.addRelease("Voir ## [0.1.0]\n\n## [1.0.0] · x\n", "1.0.1", "d", ["- A"]),
    "Voir ## [0.1.0]\n\n## [1.0.1] · d\n\n- A\n\n## [1.0.0] · x\n",
  );
});

test("contrôle d'une PR : la version ne change pas à la main, les notes sont valides", () => {
  const ok = { name: "5.md", text: note("correctif", ["- ok"]) };
  assert.deepEqual(P.check({ base: "1.3.2", head: "1.3.2", notes: [ok] }), []);
  assert.deepEqual(P.check({ base: "1.3.2", head: "1.3.2", notes: [] }), []);
  assert.deepEqual(
    P.check({
      base: "1.3.2",
      head: "1.4.0",
      notes: [ok, { name: "6.md", text: "- x\n" }],
    }),
    [
      "La version change à la main (1.3.2 → 1.4.0) : elle est calculée à la fusion, d'après les notes de changements/ (#91).",
      "changements/6.md : en-tête « --- / type: correctif ou nouveauté / --- » attendu au début",
    ],
  );
});

test("les notes en attente dans changements/ sont bien formées", async () => {
  const fs = await import("node:fs");
  const dir = new URL("../../changements/", import.meta.url);
  const notes = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((name) => ({
      name,
      text: fs.readFileSync(new URL(name, dir), "utf8"),
    }));
  assert.deepEqual(P.check({ base: "0.0.0", head: "0.0.0", notes }), []);
});
