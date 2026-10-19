#!/usr/bin/env node
// Publie les captures avant / après d'une PR dans la branche « pr-assets » (pour ne pas alourdir main),
// et affiche le tableau Markdown à coller dans la PR.
//   npm run pr-assets -- 42 [1-pret 4-fin-du-temps …]   (sans liste : tous les écrans)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const [pr, ...only] = process.argv.slice(2);
if (!/^\d+$/.test(pr || "")) {
  console.error("Usage : npm run pr-assets -- <numéro de PR> [écrans…]");
  process.exit(1);
}
// commandes lancées sans shell, arguments séparés : un chemin ou un argument ne peut pas devenir une commande
/** @param {string} cmd @param {string[]} args */
const run = (cmd, args, cwd = root) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8" }).trim();
const git = (/** @type {string[]} */ args, cwd = root) => run("git", args, cwd);
const repo = run("gh", [
  "repo",
  "view",
  "--json",
  "nameWithOwner",
  "--jq",
  ".nameWithOwner",
]);
const shots = path.join(root, "screenshots");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-assets-"));
const exists = git(["ls-remote", "--heads", "origin", "pr-assets"]);
if (exists) git(["worktree", "add", dir, "origin/pr-assets", "--detach"]);
else {
  git(["worktree", "add", "--detach", dir]);
  git(["checkout", "--orphan", "pr-assets-new"], dir);
  git(["rm", "-rfq", "."], dir);
}
try {
  const dest = path.join(dir, `pr-${pr}`);
  fs.rmSync(dest, { recursive: true, force: true });
  // colonnes : « avant », « apres », puis les autres dossiers de screenshots/ (variantes…)
  const sides = fs
    .readdirSync(shots)
    .filter((d) => fs.statSync(path.join(shots, d)).isDirectory())
    .sort(
      (a, b) =>
        ["avant", "apres"].indexOf(a) - ["avant", "apres"].indexOf(b) ||
        a.localeCompare(b),
    );
  const rows = new Map(); // écran + appareil → { dossier: url }
  for (const side of sides) {
    const src = path.join(shots, side);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.join(dest, side), { recursive: true });
    for (const f of fs.readdirSync(src)) {
      const [device, screen] = f.replace(/\.png$/, "").split("--");
      if (only.length && !only.includes(screen)) continue;
      fs.copyFileSync(path.join(src, f), path.join(dest, side, f));
      const key = `${screen} · ${device}`;
      rows.set(key, {
        ...rows.get(key),
        [side]: `https://raw.githubusercontent.com/${repo}/pr-assets/pr-${pr}/${side}/${f}`,
      });
    }
  }
  // le dossier de travail partage la configuration du dépôt (nom et adresse masquée de l'auteur)
  git(["add", "-A"], dir);
  git(["commit", "-qm", `Captures de la PR #${pr}`], dir);
  git(["push", "-q", "origin", "HEAD:pr-assets"], dir);
  const img = (u) => (u ? `<img src="${u}" width="180">` : "—");
  const table = [
    `| Écran | ${sides.join(" | ")} |`,
    `|---|${sides.map(() => "---").join("|")}|`,
    ...[...rows]
      .sort()
      .map(([k, v]) => `| ${k} | ${sides.map((s) => img(v[s])).join(" | ")} |`),
  ].join("\n");
  console.log(table);
  // repris par scripts/pr-body.js (#57)
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/pr-assets.md"), table + "\n");
} finally {
  execFileSync("git", ["worktree", "remove", "--force", dir], {
    cwd: root,
    stdio: "ignore",
  });
}
