// Version et notes de version calculées à la fusion (#91). Chaque PR visible dépose une note dans changements/ ;
// à l'arrivée sur main, la CI les réunit en une version (scripts/publier.js). Plus de numéro de version disputé
// entre deux PR. Pur.

/** @typedef {{ type: "correctif" | "nouveauté", lines: string[] }} Note */
/** @typedef {{ name: string, text: string }} NoteFile */

const TYPES = ["correctif", "nouveauté"];
const HEADER =
  "en-tête « --- / type: correctif ou nouveauté / --- » attendu au début";

/**
 * Une note de changements/ : son en-tête donne le type, puis viennent les lignes du journal (« - … »).
 * @param {string} name nom du fichier, pour les messages
 * @param {string} text
 * @returns {Note}
 */
function parseNote(name, text) {
  const fail = (/** @type {string} */ why) => {
    throw new Error(`changements/${name} : ${why}`);
  };
  const m = text.replace(/\r/g, "").match(/^---\ntype:(.*)\n---\n([^]*)$/);
  if (!m) return fail(HEADER);
  const type = m[1].trim();
  if (!TYPES.includes(type))
    return fail(`type « ${type} » inconnu : correctif ou nouveauté`);
  const lines = m[2]
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);
  for (const l of lines)
    if (!/^- +\S/.test(l)) fail(`« ${l} » : chaque ligne commence par « - »`);
  if (!lines.length) fail("aucune ligne « - … » pour le journal");
  return { type: /** @type {Note["type"]} */ (type), lines };
}

/**
 * La version qui suit : mineure s'il y a une nouveauté, correctif sinon ; null sans note.
 * @param {string} version
 * @param {Note[]} notes
 */
function nextVersion(version, notes) {
  const v = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!v) throw new Error(`version « ${version} » : SemVer x.y.z attendu`);
  if (!notes.length) return null;
  const [major, minor, patch] = v.slice(1).map(Number);
  return notes.some((n) => n.type === "nouveauté")
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;
}

/**
 * Le journal avec une nouvelle version en tête, avant la précédente (ou à la fin s'il n'y en a pas).
 * @param {string} changelog
 * @param {string} version
 * @param {string} date AAAA-MM-JJ
 * @param {string[]} lines
 */
function addRelease(changelog, version, date, lines) {
  const block = `## [${version}] · ${date}\n\n${lines.join("\n")}\n`;
  const i = changelog.search(/^## /m);
  if (i < 0) return `${changelog.trimEnd()}\n\n${block}`;
  return `${changelog.slice(0, i)}${block}\n${changelog.slice(i)}`;
}

/** Ordre des notes : celui des numéros d'issue (« 9.md » avant « 10.md ») @param {NoteFile[]} files */
const sorted = (files) =>
  [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { numeric: true }),
  );

/**
 * Toutes les notes en attente réunies en une version : les nouveautés d'abord, puis les correctifs, chacun dans
 * l'ordre des issues. null s'il n'y a rien à publier.
 * @param {{ version: string, changelog: string, date: string, notes: NoteFile[] }} state
 * @returns {{ version: string, changelog: string } | null}
 */
function publish({ version, changelog, date, notes }) {
  const parsed = sorted(notes).map((f) => parseNote(f.name, f.text));
  const next = nextVersion(version, parsed);
  if (!next) return null;
  const lines = ["nouveauté", "correctif"].flatMap((t) =>
    parsed.filter((n) => n.type === t).flatMap((n) => n.lines),
  );
  return { version: next, changelog: addRelease(changelog, next, date, lines) };
}

/**
 * Contrôle d'une PR : la version n'est pas changée à la main, et ses notes sont valides. Liste des erreurs.
 * @param {{ base: string, head: string, notes: NoteFile[] }} pr
 */
function check({ base, head, notes }) {
  const errors = [];
  if (base !== head)
    errors.push(
      `La version change à la main (${base} → ${head}) : elle est calculée à la fusion, d'après les notes de changements/ (#91).`,
    );
  for (const f of sorted(notes))
    try {
      parseNote(f.name, f.text);
    } catch (e) {
      errors.push(/** @type {Error} */ (e).message);
    }
  return errors;
}

module.exports = { parseNote, nextVersion, addRelease, publish, check };
