// Écran titre (#6) : présenté au premier lancement, puis une fois à chaque nouvelle version, avec ses notes
// (« Quoi de neuf », #84). Pur.
import { VERSION } from "./version.js";
import { NOTES } from "./notes.js";

/** @typedef {import('./types.js').Release} Release */

export const INTRO_KEY = "chrono-canne-intro";

/** Ancienne valeur enregistrée (numéro de présentation, avant #84) : vue au plus tard avec la 1.0.0 */
const LEGACY = "1.0.0";

/** Ordre de deux versions « x.y.z » : négatif si a est plus ancienne @param {string} a @param {string} b */
export function compareVersions(a, b) {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** @param {string} seen version déjà vue ("" : jamais) @param {string} [current] */
export const shouldShowIntro = (seen, current = VERSION) =>
  !seen || compareVersions(seen, current) < 0;

/** Notes des versions plus récentes que la dernière vue ; rien au premier lancement (c'est la présentation complète)
 * @param {string} seen @param {Release[]} [notes] */
export const whatsNew = (seen, notes = NOTES) =>
  seen ? notes.filter((n) => compareVersions(n.version, seen) > 0) : [];

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
/** « 2026-10-19 » → « 19 octobre 2026 » @param {string} iso */
export function frenchDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** @param {Pick<Storage, 'getItem'>} storage @returns {string} la version déjà vue, "" si aucune */
export function readSeen(storage) {
  try {
    const v = storage.getItem(INTRO_KEY) || "";
    if (/^\d+\.\d+\.\d+$/.test(v)) return v;
    return /^\d+$/.test(v) ? LEGACY : "";
  } catch {
    return "";
  }
}
/** @param {Pick<Storage, 'setItem'>} storage */
export function markSeen(storage) {
  try {
    storage.setItem(INTRO_KEY, VERSION);
  } catch {}
}
