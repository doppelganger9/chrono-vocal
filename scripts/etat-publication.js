#!/usr/bin/env node
// Bilan de la publication (#118) : npm run etat-publication, en local (avec gh connecté) ou dans la CI
// (workflow « État de la publication », chaque matin). Lecture seule ; code de sortie 1 s'il y a un point à régler.
// Le bilan lui-même est dans scripts/lib/etat-publication.js, testé.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const E = require("./lib/etat-publication.js");

const root = path.join(__dirname, "..");
const repo = process.env.GITHUB_REPOSITORY || "doppelganger9/chrono-vocal";
/** @param {string[]} args @returns {any} */
const gh = (...args) =>
  JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8" }));
/** Une liste complète, toutes pages réunies @param {string} route @returns {any[]} */
const api = (route) => gh("--paginate", "--slurp", route).flat();

const runs = gh(
  `repos/${repo}/actions/workflows/version.yml/runs?status=completed&per_page=1`,
).workflow_runs;
const points = E.bilan({
  changelog: fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8"),
  version: require(path.join(root, "package.json")).version,
  tags: api(`repos/${repo}/tags?per_page=100`).map(
    (/** @type {any} */ t) => t.name,
  ),
  releases: api(`repos/${repo}/releases?per_page=100`).map(
    (/** @type {any} */ r) => r.tag_name,
  ),
  prs: api(`repos/${repo}/pulls?state=open&per_page=100`).map(
    (/** @type {any} */ p) => ({
      title: p.title,
      url: p.html_url,
      createdAt: p.created_at,
    }),
  ),
  lastRun: runs[0]
    ? { conclusion: runs[0].conclusion, url: runs[0].html_url }
    : null,
  now: Date.now(),
});
const texte = E.rapport(points);
console.log(texte);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texte + "\n");
process.exit(points.length ? 1 : 0);
