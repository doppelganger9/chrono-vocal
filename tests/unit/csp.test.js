// Politique de sécurité du contenu (#37) : une balise meta dans index.html, GitHub Pages ne permettant pas les en-têtes HTTP.
// Les tests de bout en bout font échouer toute violation (tests/e2e/fixtures.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(
  new URL("../../index.html", import.meta.url),
  "utf8",
);
const meta = html.match(
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/,
);
/** @type {Record<string, string>} */
const csp = Object.fromEntries(
  (meta?.[1] ?? "")
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join(" ")]),
);

test("la politique est dans index.html, avant toute ressource", () => {
  assert.ok(meta, "balise meta Content-Security-Policy absente");
  const at = html.indexOf(meta[0]);
  for (const tag of ["<link", "<script", "<style"])
    assert.ok(
      html.indexOf(tag) === -1 || html.indexOf(tag) > at,
      `${tag} avant la politique : il lui échapperait`,
    );
});

test("rien n'est permis par défaut, sauf ce que le site sert lui-même", () => {
  assert.equal(csp["default-src"], "'none'");
  for (const d of ["script-src", "style-src", "img-src", "manifest-src"])
    assert.equal(csp[d], "'self'", d);
  // écoute d'une captation audio (#136) : le fichier, lu dans le stockage du téléphone, seulement
  assert.equal(csp["media-src"], "blob:");
  assert.equal(csp["base-uri"], "'none'");
  assert.equal(csp["form-action"], "'none'");
});

test("pas de script ni de style en ligne, pas d'eval, aucune connexion", () => {
  assert.doesNotMatch(
    meta?.[1] ?? "",
    /unsafe-inline|unsafe-eval|https?:|data:|\*/,
  );
  assert.equal(
    csp["connect-src"],
    undefined,
    "connect-src : default-src 'none' suffit",
  );
  assert.doesNotMatch(html, /\sstyle="/, "style en ligne dans index.html");
  assert.doesNotMatch(
    html,
    /<script(?![^>]*\ssrc=)/,
    "script en ligne dans index.html",
  );
});
