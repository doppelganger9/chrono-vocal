#!/usr/bin/env node
// Recopie la version de package.json dans js/version.js et sw.js (#39, #40). Lancé par npm après
// « npm version minor --no-git-tag-version » (script « version » de package.json) ; reste à écrire CHANGELOG.md.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const { version } = require("../package.json");
for (const file of ["js/version.js", "sw.js"]) {
  const p = path.join(root, file);
  const before = fs.readFileSync(p, "utf8");
  const after = before.replace(/(const VERSION = ")[^"]+(")/, `$1${version}$2`);
  if (after === before && !before.includes(`"${version}"`))
    throw new Error(`${file} : « const VERSION = "…" » introuvable`);
  fs.writeFileSync(p, after);
  console.log(`${file} : ${version}`);
}
