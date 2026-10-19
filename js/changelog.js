// Notes de version (#84) : CHANGELOG.md lu pour l'écran titre. La page ne peut pas le charger (la politique de
// sécurité interdit fetch) : scripts/notes.js le recopie dans js/notes.js, grâce à cette fonction. Pur.

/** @typedef {import('./types.js').Release} Release */

/** Une ligne du journal, sans ce qui ne parle qu'aux développeurs : numéros d'issue, mise en forme Markdown @param {string} s */
const clean = (s) =>
  s
    .replace(/\s*\(#\d+(?:,\s*#\d+)*\)/g, "")
    .replace(/\*\*|`/g, "")
    .trim();

/**
 * Les versions de CHANGELOG.md, de la plus récente à la plus ancienne : chacune avec ses lignes, rangées par
 * rubrique (« ### Le chrono » ; sans titre avant la première rubrique). Le texte hors liste est laissé de côté.
 * @param {string} md
 * @returns {Release[]}
 */
export function parseChangelog(md) {
  /** @type {Release[]} */
  const releases = [];
  for (const line of md.split("\n")) {
    const v = line.match(/^## \[([^\]]+)\] · (\S+)/);
    if (v) {
      releases.push({
        version: v[1],
        date: v[2],
        sections: [{ title: "", items: [] }],
      });
      continue;
    }
    const r = releases.at(-1);
    if (!r) continue;
    const h = line.match(/^### (.+)/);
    if (h) r.sections.push({ title: clean(h[1]), items: [] });
    else if (line.startsWith("- "))
      r.sections.at(-1)?.items.push(clean(line.slice(2)));
  }
  for (const r of releases)
    r.sections = r.sections.filter((s) => s.items.length);
  return releases;
}
