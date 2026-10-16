// Réglages : valeurs par défaut, migrations des versions enregistrées sur le téléphone, stockage.
/** @typedef {import('./types.js').Config} Config */

export const STORAGE_KEY = 'chrono-canne';

/** @type {Config} */
export const DEFAULTS = {
  v: 5, mode: 'assaut', preset: 'custom', rounds: 3, roundSec: 90, restSec: 60, extraMax: 1, extraSec: 90,
  relayBase: 90, relayCount: 3,
  countStops: true, prolong: 'propose', requireEnGarde: false, autoRest: false, calls: [30, 15, 5],
  colors: ['rouge', 'bleu'], answerReady: true,
  learned: { STOP: [], ALLEZ: [], REPOS: [] },
  theme: 'auto', palette: {}, board: false,
};

// Préréglages : maximums des compétitions nationales (J 4.3), repos d'une minute
/** @type {{ id: string, label: string, rounds?: number, roundSec?: number, extraMax?: number }[]} */
export const PRESETS = [
  { id: 'custom', label: 'Personnalisé' },
  { id: 'm9', label: 'Moins de 9 ans — 2 × 1\'30"', rounds: 2, roundSec: 90, extraMax: 0 },
  { id: 'm12', label: 'Moins de 12 ans — 2 × 1\'30"', rounds: 2, roundSec: 90, extraMax: 1 },
  { id: 'm15cdf', label: 'Moins de 15 ans, Ch. de France — 2 × 1\'30"', rounds: 2, roundSec: 90, extraMax: 1 },
  { id: 'm15', label: 'Moins de 15 ans, Challenge Jeunes — 3 × 1\'30"', rounds: 3, roundSec: 90, extraMax: 1 },
  { id: 'm18', label: 'Moins de 18 ans — 3 × 1\'30"', rounds: 3, roundSec: 90, extraMax: 1 },
  { id: 'sen', label: 'Seniors, phases 1 et 2 — 3 × 2\'', rounds: 3, roundSec: 120, extraMax: 1 },
  { id: 'senf', label: 'Seniors, finales — 4 × 2\'', rounds: 4, roundSec: 120, extraMax: 1 },
  { id: 'vet', label: 'Vétérans, phases 1 et 2 — 3 × 1\'30"', rounds: 3, roundSec: 90, extraMax: 1 },
  { id: 'vetf', label: 'Vétérans, finales — 4 × 1\'30"', rounds: 4, roundSec: 90, extraMax: 1 },
];

/** Règles toujours vraies : 1 à 4 reprises (I 2.3.1) ; en assaut, une reprise supplémentaire dure comme les autres */
/** @param {Config} c @returns {Config} */
export function normalizeConfig(c) {
  const out = { ...c, rounds: Math.min(4, Math.max(1, c.rounds)) };
  if (out.mode !== 'relais') out.extraSec = out.roundSec;
  return out;
}

/** Réglages enregistrés (de n'importe quelle version) → réglages complets et à jour */
/** @param {Partial<Config> & Record<string, any>} [saved] @returns {Config} */
export function migrate(saved = {}) {
  const c = { ...DEFAULTS, ...saved, learned: { ...DEFAULTS.learned, ...(saved.learned || {}) }, palette: { ...(saved.palette || {}) } };
  if (!saved.v || saved.v < 2) { // d'avant l'alignement sur le protocole officiel (annonces 30/15/5)
    if (JSON.stringify(saved.calls) === '[15,10,5]') c.calls = [30, 15, 5];
  }
  if (!saved.v || saved.v < 3) { // couleurs officielles : rouge et bleu
    if (JSON.stringify(saved.colors) === '["jaune","bleu"]') c.colors = ['rouge', 'bleu'];
  }
  if (typeof saved.prolong === 'boolean') c.prolong = saved.prolong ? 'propose' : 'off'; // l'arbitre décide
  c.v = DEFAULTS.v;
  return normalizeConfig(c);
}

/** @param {Pick<Storage, 'getItem'>} storage */
export function load(storage) {
  let saved = {};
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY) || '{}') || {}; } catch {}
  return migrate(saved);
}

/** @param {Pick<Storage, 'setItem'>} storage @param {Config} cfg */
export function save(storage, cfg) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
}
