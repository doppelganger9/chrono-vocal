#!/usr/bin/env node
// Journal vocal exporté en salle → fichier de corpus à relire (#3, décision D3.1 : seulement des phrases courtes).
//   node scripts/corpus-from-journal.js chrono-canne-journal-vocal.json [tests/corpus/2026-10-entrainement.json]
// « phrases » : ce que l'app a compris, rejoué par les tests unitaires (corrigez « expect » si l'app s'est trompée :
// le test devient rouge, et on corrige js/lang.js). « a_relire » : phrases non reconnues, à classer à la main.
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const { classify } = await import(path.join(__dirname, "../js/lang.js"));
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
  const { journal = [] } = JSON.parse(fs.readFileSync(src, "utf8"));
  const seen = new Set(),
    phrases = [],
    aRelire = [];
  for (const e of journal) {
    const text = (e.alts?.[0] || "").trim();
    if (
      !e.final ||
      !text ||
      text.split(/\s+/).length > 12 ||
      seen.has(text.toLowerCase())
    )
      continue; // phrases courtes seulement
    seen.add(text.toLowerCase());
    const c = classify(text, {}, ["rouge", "bleu"]);
    if (c.kind === "none") {
      aRelire.push({ text, alternatives: e.alts.slice(1), phase: e.phase });
      continue;
    }
    const keep = {
      command: ["kind", "cmd", "end"],
      motif: ["kind", "type", "color"],
      referee: ["kind", "rounds", "roundSec", "restSec"],
    }[c.kind] || ["kind"];
    phrases.push({
      text,
      expect: Object.fromEntries(
        keep.filter((k) => k in c).map((k) => [k, /** @type {any} */ (c)[k]]),
      ),
    });
  }
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        source: `Journal vocal ${path.basename(src)} — à relire avant commit (pas de noms, pas de conversations)`,
        colors: ["rouge", "bleu"],
        phrases,
        a_relire: aRelire,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${out} : ${phrases.length} phrases reconnues, ${aRelire.length} à relire`,
  );
})();
