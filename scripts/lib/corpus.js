// Journal vocal exporté → fichier de corpus à relire (#3), avec la version et le navigateur du journal (#112).
// Pur : scripts/corpus-from-journal.js lit et écrit les fichiers.

/** Phrases plus longues : des conversations plutôt que des commandements (décision D3.1) */
const MAX_WORDS = 12;
/** @type {Record<string, string[]>} */
const KEEP = {
  command: ["kind", "cmd", "end"],
  motif: ["kind", "type", "color"],
  referee: ["kind", "rounds", "roundSec", "restSec"],
};

/**
 * Versions de l'app vues dans un journal : celle de chaque début d'écoute, puis celle de l'export, sans doublon.
 * Un journal d'avant #112 n'en a aucune.
 * @param {any} data @returns {string[]}
 */
function versions(data) {
  const journal = Array.isArray(data?.journal) ? data.journal : [];
  const seen = [...journal.map((/** @type {any} */ e) => e?.v), data?.version];
  return [...new Set(seen.filter((v) => typeof v === "string"))];
}

/**
 * @param {any} data le journal exporté
 * @param {string} file son nom, pour la source
 * @param {{ classify: (text: string, cfg: object, colors: string[]) => any,
 *   browserName: (userAgent: unknown) => string }} deps js/lang.js et js/journal.js, des modules ES
 */
function corpusFromJournal(data, file, { classify, browserName }) {
  const seen = new Set();
  /** @type {any[]} */
  const phrases = [];
  /** @type {any[]} */
  const aRelire = [];
  for (const e of Array.isArray(data?.journal) ? data.journal : []) {
    const alts = Array.isArray(e?.alts) ? e.alts : [];
    const text = typeof alts[0] === "string" ? alts[0].trim() : "";
    if (
      !e?.final ||
      !text ||
      text.split(/\s+/).length > MAX_WORDS ||
      seen.has(text.toLowerCase())
    )
      continue; // phrases courtes seulement
    seen.add(text.toLowerCase());
    const c = classify(text, {}, ["rouge", "bleu"]);
    if (c.kind === "none") {
      aRelire.push({ text, alternatives: alts.slice(1), phase: e.phase });
      continue;
    }
    const keep = KEEP[c.kind] || ["kind"];
    phrases.push({
      text,
      expect: Object.fromEntries(
        keep.filter((k) => k in c).map((k) => [k, c[k]]),
      ),
    });
  }
  const version = versions(data).join(", ") || "inconnue";
  const navigateur = browserName(data?.userAgent);
  return {
    source: `Journal vocal ${file} (version ${version}, navigateur ${navigateur}) — à relire avant commit (pas de noms, pas de conversations)`,
    version,
    navigateur,
    exporte: typeof data?.exported === "string" ? data.exported : undefined,
    colors: ["rouge", "bleu"],
    phrases,
    a_relire: aRelire,
  };
}

module.exports = { corpusFromJournal, versions };
