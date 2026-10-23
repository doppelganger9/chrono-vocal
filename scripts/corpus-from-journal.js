#!/usr/bin/env node
// Journal vocal exporté en salle → fichier de corpus à relire (#3, décision D3.1 : seulement des phrases courtes).
//   node scripts/corpus-from-journal.js chrono-canne-journal-vocal.json [tests/corpus/2026-10-entrainement.json]
// « phrases » : ce que l'app a compris, rejoué par les tests unitaires (corrigez « expect » si l'app s'est trompée :
// le test devient rouge, et on corrige js/lang.js). « a_relire » : phrases non reconnues, à classer à la main.
// « version » et « navigateur » (#112) : avec quelle version de l'app et quel navigateur le journal a été noté
// (« inconnue » pour un journal exporté avant #112) ; le navigateur en nom court seulement, le dépôt est public.
const fs = require("node:fs");
const path = require("node:path");
const { corpusFromJournal } = require("./lib/corpus.js");

(async () => {
  const { classify } = await import(path.join(__dirname, "../js/lang.js"));
  const { browserName } = await import(
    path.join(__dirname, "../js/journal.js")
  );
  const [
    src,
    out = `tests/corpus/${new Date().toISOString().slice(0, 10)}-journal.json`,
  ] = process.argv.slice(2);
  if (!src) {
    console.error(
      "Usage : node scripts/corpus-from-journal.js <journal.json> [corpus.json]",
    );
    process.exit(1);
  }
  const corpus = corpusFromJournal(
    JSON.parse(fs.readFileSync(src, "utf8")),
    path.basename(src),
    { classify, browserName },
  );
  fs.writeFileSync(out, JSON.stringify(corpus, null, 2) + "\n");
  console.log(
    `${out} : ${corpus.phrases.length} phrases reconnues, ${corpus.a_relire.length} à relire (version ${corpus.version}, navigateur ${corpus.navigateur})`,
  );
})();
