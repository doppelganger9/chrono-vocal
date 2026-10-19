#!/usr/bin/env node
// Recopie CHANGELOG.md dans js/notes.js (#84) : les notes de version de l'écran titre. La page ne peut pas lire
// CHANGELOG.md elle-même (politique de sécurité : pas de fetch). À relancer après chaque modification du journal ;
// tests/unit/version.test.js vérifie que les deux sont d'accord.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
(async () => {
  const { parseChangelog } = await import("../js/changelog.js");
  const notes = parseChangelog(
    fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8"),
  );
  const out = path.join(root, "js/notes.js");
  fs.writeFileSync(
    out,
    `// Généré par « npm run notes » depuis CHANGELOG.md : ne pas modifier à la main (#84).
/** @type {import('./types.js').Release[]} */
export const NOTES = ${JSON.stringify(notes)};
`,
  );
  execFileSync("npx", ["prettier", "--write", out], { cwd: root });
  console.log(`js/notes.js : ${notes.length} versions`);
})();
