// Numéro de version et journal des changements (#39)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { VERSION } from "../../js/version.js";
import { NOTES } from "../../js/notes.js";
import { parseChangelog } from "../../js/changelog.js";

const read = (f) =>
  fs.readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const changelog = read("CHANGELOG.md");

test("la version de l'app est celle de package.json, au format SemVer", () => {
  assert.equal(VERSION, pkg.version);
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});

test("le journal des changements commence par la version en cours", () => {
  const first = changelog.match(/^## \[([^\]]+)\]/m)?.[1];
  assert.equal(first, VERSION, "première version de CHANGELOG.md");
});

test("les versions du journal sont datées et vont en décroissant", () => {
  const versions = [
    ...changelog.matchAll(
      /^## \[(\d+)\.(\d+)\.(\d+)\] · (\d{4}-\d{2}-\d{2})$/gm,
    ),
  ];
  assert.ok(versions.length > 0, "aucune version « ## [x.y.z] · AAAA-MM-JJ »");
  const n = versions.map(([, a, b, c]) => +a * 1e6 + +b * 1e3 + +c);
  assert.deepEqual(
    n,
    [...n].sort((x, y) => y - x),
  );
  assert.equal(
    versions.length,
    (changelog.match(/^## /gm) || []).length,
    "un titre de version mal formé",
  );
});

test("les notes de version de l'app sont celles du journal des changements (#84)", () => {
  assert.deepEqual(
    NOTES,
    parseChangelog(changelog),
    "js/notes.js en retard sur CHANGELOG.md : lancer « npm run notes »",
  );
  assert.equal(NOTES[0].version, VERSION);
});
