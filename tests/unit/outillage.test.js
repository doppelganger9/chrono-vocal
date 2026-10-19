// Outillage (#57) : garde-fou de version de Node, résumé de npm run verifier, description de PR générée
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { tooOld, MIN_NODE } = require("../../scripts/check-node.js");
const M = require("../../scripts/lib/mesures.js");
const { buildBody, isFresh } = require("../../scripts/pr-body.js");

const root = new URL("../../", import.meta.url);
const pkg = JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8"));

test("Node : trop ancien sous la version minimale, et la même version partout", () => {
  assert.equal(tooOld("12.22.1"), true);
  assert.equal(tooOld("19.9.0"), true);
  assert.equal(tooOld("20.0.0"), false);
  assert.equal(tooOld("26.8.2"), false);
  assert.equal(pkg.engines.node, `>=${MIN_NODE}`, "package.json engines");
  const nvmrc = +fs.readFileSync(new URL(".nvmrc", root), "utf8").trim();
  assert.ok(nvmrc >= MIN_NODE, ".nvmrc");
  assert.match(
    fs.readFileSync(new URL(".npmrc", root), "utf8"),
    /^engine-strict=true$/m,
    "npm install refuse un Node trop ancien",
  );
  assert.match(
    pkg.scripts.pretest,
    /check-node/,
    "npm test vérifie Node d'abord",
  );
});

test("mesures : résumés des tests unitaires et de bout en bout", () => {
  assert.deepEqual(
    M.parseNodeTest("ℹ tests 146\nℹ pass 145\nℹ fail 0\nℹ skipped 1\n"),
    { pass: 145, fail: 0, skipped: 1 },
  );
  assert.deepEqual(M.parseNodeTest("rien"), { pass: 0, fail: 0, skipped: 0 });
  // sortie TAP (sans terminal, dans certains environnements) : « # pass 182 »
  assert.deepEqual(
    M.parseNodeTest("# tests 182\n# pass 181\n# fail 1\n# skipped 0\n"),
    { pass: 181, fail: 1, skipped: 0 },
  );
  assert.deepEqual(
    M.parsePlaywright(
      "  2 failed\n  1 flaky\n  1 skipped\n  175 passed (39.1s)\n",
    ),
    { passed: 175, failed: 2, flaky: 1, skipped: 1, seconds: 39.1 },
  );
  assert.deepEqual(M.parsePlaywright("  12 passed (1.2m)"), {
    passed: 12,
    failed: 0,
    flaky: 0,
    skipped: 0,
    seconds: 72,
  });
});

test("mesures : couverture et score de mutation", () => {
  const md =
    "| Statements | 🟢 94.44 % |   1,596 |\n| Branches | 🟢 86.85 % |     938 |\n| Lines | 🟢 90.1 % | 1 |";
  assert.deepEqual(M.parseCoverage(md), {
    statements: 94.44,
    branches: 86.85,
    lines: 90.1,
  });
  const report = {
    files: {
      "js/a.js": {
        source: "x\ny",
        mutants: [
          { status: "Killed" },
          {
            status: "Survived",
            mutatorName: "Regex",
            location: { start: { line: 2 } },
            replacement: "/a/",
          },
          { status: "Timeout" },
          { status: "Ignored" },
        ],
      },
      "js/b.js": {
        source: "",
        mutants: [
          { status: "Killed" },
          {
            status: "NoCoverage",
            mutatorName: "BooleanLiteral",
            location: { start: { line: 1 } },
          },
        ],
      },
    },
  };
  const s = M.mutationScore(report);
  assert.equal(s.total, 60);
  assert.deepEqual(s.files, { "js/a.js": 66.67, "js/b.js": 50 });
  assert.deepEqual(
    s.survivors.map((x) => `${x.file}:${x.line} ${x.mutator}`),
    ["js/a.js:2 Regex", "js/b.js:1 BooleanLiteral"],
  );
});

test("description de PR : toutes les rubriques du modèle, les mesures remplies, le reste à écrire", () => {
  const body = buildBody({
    issue: 57,
    visible: false,
    verif: {
      unit: { pass: 150, fail: 0, skipped: 0 },
      e2e: { passed: 180, failed: 0, flaky: 0, skipped: 1, seconds: 40.5 },
    },
    base: {
      unit: { pass: 145, fail: 0, skipped: 0 },
      e2e: { passed: 175, failed: 0, flaky: 0, skipped: 1, seconds: 39 },
    },
    coverage: { statements: 94.5, branches: 87, lines: 90 },
    mutation: {
      total: 90.2,
      files: { "js/lang.js": 87.5 },
      survivors: [
        { file: "js/lang.js", line: 3, mutator: "Regex", replacement: "/x/" },
      ],
    },
    touched: ["js/lang.js"],
    assets: null,
    perf: null,
    ai: "| Mesure | Valeur |\n|---|---|\n| Durée | 5 min |",
  });
  for (const h of [
    "## Résumé",
    "## Ce qui change pour l'utilisateur",
    "## Captures avant / après",
    "## Gains mesurés",
    "## Qualité",
    "## Coût de développement (statistiques IA)",
    "## À vérifier sur téléphone",
    "## Écarts par rapport à l'issue",
  ])
    assert.ok(body.includes(h), h);
  assert.match(body, /Closes #57/);
  assert.match(body, /Tests unitaires : 145 → 150/);
  assert.match(
    body,
    /Tests de bout en bout : 175 → 180\*\* \(1 ignoré\), en 40,5 s/,
  );
  assert.match(body, /94,5 % des instructions, 87 % des branches/);
  assert.match(body, /Mutation : 90,2 %/);
  assert.match(body, /js\/lang\.js:3 Regex/);
  assert.match(body, /Sans changement visible/);
  assert.match(body, /Sans objet/, "pas de mesure de perf");
  assert.match(body, /\| Durée \| 5 min \|/);
  assert.match(body, /À ÉCRIRE/, "le pourquoi reste à écrire");
  assert.match(body, /🤖 Generated with \[Claude Code\]/);
  assert.match(
    buildBody({ issue: 1, visible: true, assets: "| a |", touched: [] }),
    /\| a \|/,
  );
});

test("description de PR : une mesure d'une PR précédente n'est pas reprise", () => {
  const since = "2026-10-18T15:40:00Z";
  assert.equal(isFresh(Date.parse("2026-10-18T15:39:59Z"), since), false);
  assert.equal(isFresh(Date.parse("2026-10-18T15:40:00Z"), since), true);
  assert.equal(
    isFresh(0, undefined),
    true,
    "sans date de début : tout est repris",
  );
});
