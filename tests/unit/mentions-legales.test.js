// Mentions légales et confidentialité (#86) : une page servie par le site, sous la même politique de sécurité
// que l'app (#37), et ce qu'elle doit dire (LCEN, RGPD, fédération)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (f) =>
  fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
const page = read("mentions-legales.html");
const index = read("index.html");
const csp = (html) =>
  html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*"/,
  )?.[0];
// le texte lu, sans les balises ni les retours à la ligne de la mise en forme
const text = page
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

test("la page a la même politique de sécurité que l'app, avant toute ressource", () => {
  assert.ok(csp(page), "balise meta Content-Security-Policy absente");
  assert.equal(csp(page), csp(index));
  const at = page.indexOf(csp(page) ?? "");
  for (const tag of ["<link", "<script", "<style"])
    assert.ok(page.indexOf(tag) === -1 || page.indexOf(tag) > at, tag);
});

test("pas de style ni de script en ligne, ni de ressource d'un autre site", () => {
  assert.doesNotMatch(
    page,
    /<style|\sstyle=|\son[a-z]+=|<script(?![^>]*\ssrc=)/,
  );
  for (const [, url] of page.matchAll(
    /<(?:link|script|img)[^>]*(?:href|src)="([^"]+)"/g,
  ))
    assert.doesNotMatch(url, /^(https?:)?\/\//, url);
});

test("éditeur anonyme (LCEN, art. 6-III) et hébergeur nommé, avec son adresse", () => {
  assert.match(text, /6-III/);
  assert.match(
    text,
    /GitHub Inc\., 88 Colin P Kelly Jr St, San Francisco, CA 94107/,
  );
});

test("ce que l'app garde sur le téléphone, et comment l'effacer", () => {
  for (const what of [
    "réglages",
    "dernier assaut",
    "version",
    "journal vocal",
    "captation audio", // #136
  ])
    assert.match(text, new RegExp(what, "i"), what);
  assert.match(text, /7 jours/);
  assert.match(text, /effacer/i);
  assert.match(text, /Rien n'est envoyé/);
});

test("ni cookie ni traceur", () => {
  assert.match(text, /aucun cookie/i);
  assert.match(text, /aucun traceur/i);
});

test("la voix selon le téléphone : iPhone constaté hors ligne, sans le garantir ; Android par Google", () => {
  assert.match(text, /iPhone[^.]*constaté en mode avion/);
  assert.match(text, /pas une garantie d'Apple/);
  assert.match(text, /Android[^.]*Google/);
});

test("les journaux de visite de GitHub Pages", () => {
  assert.match(text, /GitHub Pages[^.]*adresses? IP/);
});

test("un outil indépendant de la fédération : en compétition, le chronométrage officiel fait foi", () => {
  assert.match(text, /FFSBF&DA/);
  assert.match(text, /chronométrage officiel fait foi/);
});

test("un lien ramène au chrono", () => {
  assert.match(page, /<a href="\.\/"[^>]*>Retour au chrono<\/a>/);
});

test("l'écran titre, ouvert aussi par « À propos », annonce la voix avant « Commencer » et mène à la page", () => {
  const intro = index.match(/<dialog id="intro"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  const privacy = intro.indexOf('id="introPrivacy"');
  assert.ok(privacy > 0, "phrase absente de l'écran titre");
  assert.ok(privacy < intro.indexOf('id="introStart"'), "avant « Commencer »");
  assert.match(
    intro.replace(/\s+/g, " "),
    /Sur iPhone, la voix reste sur le téléphone ; sur Android, Chrome l'envoie à Google pour la reconnaître\./,
  );
  assert.match(intro, /<a id="introLegal" href="mentions-legales\.html"\s*>/);
});
