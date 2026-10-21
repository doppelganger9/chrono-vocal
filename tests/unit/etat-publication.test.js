// Vérification quotidienne de la publication (#118) : scripts/lib/etat-publication.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const E = require("../../scripts/lib/etat-publication.js");

const CHANGELOG = `# Journal des changements

Introduction, avec un lien [1.0.0](x).

## [1.1.0] · 2026-10-20

- Nouveauté.

## [1.0.0] · 2026-10-19

- Première version.
`;

const NOW = Date.parse("2026-10-21T12:00:00Z");
/** @param {Partial<Parameters<typeof E.bilan>[0]>} o */
const etat = (o = {}) => ({
  changelog: CHANGELOG,
  version: "1.1.0",
  tags: ["v1.0.0", "v1.1.0"],
  releases: ["v1.0.0", "v1.1.0"],
  prs: [],
  lastRun: { conclusion: "success", url: "u" },
  now: NOW,
  ...o,
});

test("versions du CHANGELOG, de la plus récente à la plus ancienne", () => {
  assert.deepEqual(E.versions(CHANGELOG), ["1.1.0", "1.0.0"]);
  assert.deepEqual(E.versions("# Rien\n"), []);
});

test("tout est en ordre : aucun problème", () => {
  assert.deepEqual(E.bilan(etat()), []);
});

test("une version sans étiquette ni release est signalée", () => {
  const p = E.bilan(etat({ tags: ["v1.1.0"], releases: ["v1.1.0"] }));
  assert.deepEqual(p, [
    "Étiquette v1.0.0 manquante (version 1.0.0 du CHANGELOG)",
    "Release v1.0.0 manquante (version 1.0.0 du CHANGELOG)",
  ]);
});

test("une étiquette sans release est signalée seule", () => {
  assert.deepEqual(E.bilan(etat({ releases: ["v1.1.0"] })), [
    "Release v1.0.0 manquante (version 1.0.0 du CHANGELOG)",
  ]);
});

test("package.json qui ne porte pas la dernière version", () => {
  assert.deepEqual(E.bilan(etat({ version: "1.0.0" })), [
    "package.json est en 1.0.0, le CHANGELOG en 1.1.0",
  ]);
});

test("CHANGELOG sans version : rien à comparer pour package.json", () => {
  assert.deepEqual(
    E.bilan(etat({ changelog: "# Rien\n", tags: [], releases: [] })),
    [],
  );
});

test("PR « Version » en attente depuis plus de 12 heures", () => {
  const pr = (/** @type {string} */ title, /** @type {number} */ h) => ({
    title,
    url: "https://x/pr/1",
    createdAt: new Date(NOW - h * 3600_000).toISOString(),
  });
  assert.deepEqual(E.bilan(etat({ prs: [pr("Version 1.2.0", 11.9)] })), []);
  assert.deepEqual(E.bilan(etat({ prs: [pr("Version 1.2.0", 12)] })), [
    "PR « Version 1.2.0 » ouverte depuis 12 h : cliquer « Approve and run » (https://x/pr/1)",
  ]);
  assert.deepEqual(E.bilan(etat({ prs: [pr("Backlog", 48)] })), []);
  assert.deepEqual(
    E.bilan(etat({ prs: [pr("Revert Version 1.2.0", 48)] })),
    [],
  );
});

test("dernière exécution de « Version » en échec", () => {
  assert.deepEqual(
    E.bilan(etat({ lastRun: { conclusion: "failure", url: "https://x/r" } })),
    ["Dernière exécution de « Version » : failure (https://x/r)"],
  );
  for (const conclusion of ["success", "skipped", null])
    assert.deepEqual(
      E.bilan(etat({ lastRun: { conclusion, url: "u" } })),
      [],
      String(conclusion),
    );
  assert.deepEqual(E.bilan(etat({ lastRun: null })), []);
});

test("rapport : titre et liste, ou « tout est en ordre »", () => {
  assert.equal(E.rapport([]), "Publication : tout est en ordre.");
  assert.equal(
    E.rapport(["a", "b"]),
    "Publication : 2 points à régler.\n\n- a\n- b",
  );
  assert.equal(E.rapport(["a"]), "Publication : 1 point à régler.\n\n- a");
});

test("seuls les titres de version comptent", () => {
  const t =
    "## [1.2.0] · x\n### [1.1.5]\nvoir ## [1.1.4]\n## [1.1] · x\n## [10.20.30]\n## [1.0.0a]\n";
  assert.deepEqual(E.versions(t), ["1.2.0", "10.20.30"]);
});

test("toutes les fins en échec de « Version » sont signalées", () => {
  for (const conclusion of [
    "failure",
    "timed_out",
    "cancelled",
    "startup_failure",
  ])
    assert.equal(
      E.bilan(etat({ lastRun: { conclusion, url: "u" } })).length,
      1,
      conclusion,
    );
});
