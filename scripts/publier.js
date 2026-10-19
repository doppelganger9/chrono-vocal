#!/usr/bin/env node
// Publication d'une version (#91), lancée par la CI à l'arrivée sur main (.github/workflows/version.yml) : les notes
// de changements/ deviennent une version de CHANGELOG.md, la version est recopiée partout (package.json,
// package-lock.json, js/version.js, sw.js) et js/notes.js régénéré ; les notes sont effacées.
// Avec « --controler <version de la base> » : contrôle d'une PR, sans rien modifier.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { publish, check } = require("./lib/publication.js");

const root = path.join(__dirname, "..");
const dir = path.join(root, "changements");
const notes = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .map((name) => ({
    name,
    text: fs.readFileSync(path.join(dir, name), "utf8"),
  }));
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

const i = process.argv.indexOf("--controler");
if (i >= 0) {
  const errors = check({ base: process.argv[i + 1], head: version, notes });
  for (const e of errors) console.error(e);
  if (errors.length) process.exit(1);
  console.log(
    `Version ${version} inchangée ; ${notes.length} note(s) valide(s)`,
  );
  process.exit(0);
}

const changelogPath = path.join(root, "CHANGELOG.md");
const r = publish({
  version,
  changelog: fs.readFileSync(changelogPath, "utf8"),
  // la date du jour en France, au format du journal
  date: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }),
  notes,
});
if (!r) {
  console.log("Aucune note dans changements/ : rien à publier");
  process.exit(0);
}
fs.writeFileSync(changelogPath, r.changelog);
for (const n of notes) fs.unlinkSync(path.join(dir, n.name));
const npm = (/** @type {string[]} */ ...args) =>
  execFileSync("npm", args, { cwd: root, stdio: "inherit" });
// recopie aussi la version dans js/version.js et sw.js (script « version » de package.json)
npm("version", r.version, "--no-git-tag-version");
npm("run", "notes");
console.log(`Version ${r.version} : ${notes.length} note(s) publiée(s)`);
