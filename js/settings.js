// Réglages : valeurs par défaut, migrations des versions enregistrées sur le téléphone, stockage.
/** @typedef {import('./types.js').Config} Config */

export const STORAGE_KEY = "chrono-canne";

/** @type {Config} */
export const DEFAULTS = {
  v: 5,
  mode: "assaut",
  preset: "custom",
  rounds: 3,
  roundSec: 90,
  restSec: 60,
  extraMax: 1,
  extraSec: 90,
  relayBase: 90,
  relayCount: 3,
  countStops: true,
  prolong: "propose",
  requireEnGarde: false,
  autoRest: false,
  calls: [30, 15, 5],
  colors: ["rouge", "bleu"],
  answerReady: true,
  learned: { STOP: [], ALLEZ: [], REPOS: [] },
  theme: "auto",
  palette: {},
  board: false,
};

// Préréglages : maximums des compétitions nationales (J 4.3), repos d'une minute
/** @type {{ id: string, label: string, rounds?: number, roundSec?: number, extraMax?: number }[]} */
export const PRESETS = [
  { id: "custom", label: "Personnalisé" },
  {
    id: "m9",
    label: "Moins de 9 ans — 2 × 1'30\"",
    rounds: 2,
    roundSec: 90,
    extraMax: 0,
  },
  {
    id: "m12",
    label: "Moins de 12 ans — 2 × 1'30\"",
    rounds: 2,
    roundSec: 90,
    extraMax: 1,
  },
  {
    id: "m15cdf",
    label: "Moins de 15 ans, Ch. de France — 2 × 1'30\"",
    rounds: 2,
    roundSec: 90,
    extraMax: 1,
  },
  {
    id: "m15",
    label: "Moins de 15 ans, Challenge Jeunes — 3 × 1'30\"",
    rounds: 3,
    roundSec: 90,
    extraMax: 1,
  },
  {
    id: "m18",
    label: "Moins de 18 ans — 3 × 1'30\"",
    rounds: 3,
    roundSec: 90,
    extraMax: 1,
  },
  {
    id: "sen",
    label: "Seniors, phases 1 et 2 — 3 × 2'",
    rounds: 3,
    roundSec: 120,
    extraMax: 1,
  },
  {
    id: "senf",
    label: "Seniors, finales — 4 × 2'",
    rounds: 4,
    roundSec: 120,
    extraMax: 1,
  },
  {
    id: "vet",
    label: "Vétérans, phases 1 et 2 — 3 × 1'30\"",
    rounds: 3,
    roundSec: 90,
    extraMax: 1,
  },
  {
    id: "vetf",
    label: "Vétérans, finales — 4 × 1'30\"",
    rounds: 4,
    roundSec: 90,
    extraMax: 1,
  },
];

/** Règles toujours vraies : 1 à 4 reprises (I 2.3.1) ; en assaut, une reprise supplémentaire dure comme les autres */
/** @param {Config} c @returns {Config} */
export function normalizeConfig(c) {
  const out = { ...c, rounds: Math.min(4, Math.max(1, c.rounds)) };
  if (out.mode !== "relais") out.extraSec = out.roundSec;
  return out;
}

// ---------- Validation (#55) ----------
// Les réglages viennent du stockage du navigateur, ou d'un lien ou d'un fichier partagé : ils peuvent tout contenir.
// Chaque réglage invalide reprend sa valeur par défaut ; les clés inconnues sont écartées.
const COLOR = /^(?:\p{L}[\p{L} '-]{0,19})?$/u; // des lettres (accents compris), 20 caractères au plus ; vide permis
const LEARNED_WORD = /^[a-z0-9]{1,30}$/; // forme « phonétique » produite par phon() (js/lang.js)
const HEX = /^#[0-9a-f]{6}$/i;
/** @param {unknown} v */
const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** @template T @param {unknown} v @param {readonly T[]} allowed @param {T} d @returns {T} */
const oneOf = (v, allowed, d) =>
  allowed.includes(/** @type {T} */ (v)) ? /** @type {T} */ (v) : d;
/** @param {unknown} v @param {number} min @param {number} max @param {number} d */
const int = (v, min, max, d) =>
  Number.isInteger(v) &&
  /** @type {number} */ (v) >= min &&
  /** @type {number} */ (v) <= max
    ? /** @type {number} */ (v)
    : d;
/** @param {unknown} v @param {boolean} d */
const bool = (v, d) => (typeof v === "boolean" ? v : d);

/** @param {Record<string, any>} c @returns {Config} */
function sanitize(c) {
  const D = DEFAULTS;
  const learned = isObject(c.learned) ? c.learned : {};
  const palette = isObject(c.palette) ? c.palette : {};
  return {
    v: D.v,
    mode: oneOf(c.mode, ["assaut", "relais"], D.mode),
    preset: oneOf(
      c.preset,
      PRESETS.map((p) => p.id),
      D.preset,
    ),
    rounds: Number.isInteger(c.rounds)
      ? Math.min(4, Math.max(1, c.rounds))
      : D.rounds, // 1 à 4 (I 2.3.1)
    roundSec: int(c.roundSec, 1, 7200, D.roundSec), // jusqu'à la reprise unique d'un relais
    restSec: int(c.restSec, 0, 600, D.restSec),
    extraMax: int(c.extraMax, 0, 2, D.extraMax),
    extraSec: int(c.extraSec, 1, 7200, D.extraSec),
    relayBase: int(c.relayBase, 10, 600, D.relayBase),
    relayCount: int(c.relayCount, 2, 5, D.relayCount),
    countStops: bool(c.countStops, D.countStops),
    prolong: oneOf(c.prolong, ["off", "propose", "auto"], D.prolong),
    requireEnGarde: bool(c.requireEnGarde, D.requireEnGarde),
    autoRest: bool(c.autoRest, D.autoRest),
    calls: Array.isArray(c.calls)
      ? c.calls
          .filter((s) => Number.isInteger(s) && s >= 1 && s <= 600)
          .slice(0, 10)
      : [...D.calls],
    colors: [0, 1].map((i) =>
      Array.isArray(c.colors) &&
      typeof c.colors[i] === "string" &&
      COLOR.test(c.colors[i])
        ? c.colors[i]
        : D.colors[i],
    ),
    answerReady: bool(c.answerReady, D.answerReady),
    learned: /** @type {Config['learned']} */ (
      Object.fromEntries(
        /** @type {const} */ (["STOP", "ALLEZ", "REPOS"]).map((k) => [
          k,
          Array.isArray(learned[k])
            ? learned[k].filter(
                (/** @type {unknown} */ w) =>
                  typeof w === "string" && LEARNED_WORD.test(w),
              )
            : [],
        ]),
      )
    ),
    theme: oneOf(c.theme, ["auto", "jour", "nuit"], D.theme),
    palette: Object.fromEntries(
      ["round", "rest", "stop", "over"].flatMap((k) =>
        typeof palette[k] === "string" && HEX.test(palette[k])
          ? [[k, palette[k]]]
          : [],
      ),
    ),
    board: bool(c.board, D.board),
  };
}

/** Réglages enregistrés (de n'importe quelle version) → réglages complets et à jour */
/** @param {Partial<Config> & Record<string, any>} [saved] @returns {Config} */
export function migrate(saved = {}) {
  if (!isObject(saved)) saved = {};
  const c = { ...DEFAULTS, ...saved };
  if (!saved.v || saved.v < 2) {
    // d'avant l'alignement sur le protocole officiel (annonces 30/15/5)
    if (JSON.stringify(saved.calls) === "[15,10,5]") c.calls = [30, 15, 5];
  }
  if (!saved.v || saved.v < 3) {
    // couleurs officielles : rouge et bleu
    if (JSON.stringify(saved.colors) === '["jaune","bleu"]')
      c.colors = ["rouge", "bleu"];
  }
  if (typeof saved.prolong === "boolean")
    c.prolong = saved.prolong ? "propose" : "off"; // l'arbitre décide
  return normalizeConfig(sanitize(c));
}

/** @param {Pick<Storage, 'getItem'>} storage */
export function load(storage) {
  let saved = {};
  try {
    saved = JSON.parse(storage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {}
  return migrate(saved);
}

/** @param {Pick<Storage, 'setItem'>} storage @param {Config} cfg */
export function save(storage, cfg) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}
