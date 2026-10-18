// Langue et phrases de l'arbitre : fonctions pures, sans DOM ni état.
// Module ES, importé par l'app et par les tests unitaires.
/** @typedef {import('./types.js').Config} Config @typedef {import('./types.js').Learned} Learned @typedef {import('./types.js').CommandName} CommandName @typedef {import('./types.js').Motif} Motif */

// ---------- Formatage ----------
/** @param {number} s secondes → « m:ss » */
export const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
/** @param {string | number} str « 1:30 », « 2 » (minutes), « 90 » (secondes) @returns {number | null} */
export function parseMmSs(str) {
  const m = String(str).trim().match(/^(\d+)(?:[:'h.,\s]+(\d{1,2}))?$/);
  if (!m) return null;
  return m[2] !== undefined ? +m[1] * 60 + +m[2] : (+m[1] >= 10 ? +m[1] : +m[1] * 60); // "2" = 2 min, "90" = 90 s
}

export const NUM_WORDS = ['zéro','une','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
/** @type {Record<number, string>} */
export const TENS = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante' };
/** @param {number} n @param {boolean} [fem] */
export function numFr(n, fem = true) {
  if (n === 1) return fem ? 'une' : 'un';
  if (n < NUM_WORDS.length) return NUM_WORDS[n];
  if (TENS[n]) return TENS[n];
  const t = Math.floor(n / 10) * 10, u = n % 10;
  if (TENS[t]) return TENS[t] + (u === 1 ? ' et un' : '-' + NUM_WORDS[u]);
  return String(n);
}
/** @param {number} sec */
export function durationFr(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m === 0) return numFr(s, true) + (s > 1 ? ' secondes' : ' seconde');
  let out = numFr(m) + (m > 1 ? ' minutes' : ' minute');
  if (s === 30 && m === 1) return 'une minute trente';
  if (s) out += ' ' + numFr(s);
  return out;
}
/** @param {string} w */
export const de = w => /^[aeiouyh]/i.test(w) ? "d'" + w : 'de ' + w;
/** @param {Pick<Config, 'mode' | 'rounds' | 'roundSec' | 'restSec' | 'relayCount'>} c */
export function buildSentence(c) {
  if (c.mode === 'relais') return `Pour un relais à ${numFr(c.relayCount, false)} équipiers, en reprise unique ${de(durationFr(c.roundSec))}.`;
  const r = c.rounds === 1 ? 'une reprise' : numFr(c.rounds) + ' reprises';
  let s = `Pour un assaut en ${r} ${de(durationFr(c.roundSec))}`;
  if (c.rounds > 1) s += `, avec ${durationFr(c.restSec)} de repos`;
  return s + '.';
}

// ---------- Analyse de la phrase de l'arbitre ----------
/** @param {string} t */
export function normalize(t) {
  t = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'\-]/g, ' ');
  const words = { 'quarante cinq': 45, 'trente cinq': 35, 'vingt cinq': 25, 'cinquante': 50, 'quarante': 40, 'trente': 30,
    'vingt': 20, 'quinze': 15, 'dix': 10, 'neuf': 9, 'huit': 8, 'sept': 7, 'six': 6, 'cinq': 5, 'quatre': 4,
    'trois': 3, 'deux': 2, 'une': 1, 'un': 1 };
  for (const [w, n] of Object.entries(words)) t = t.replace(new RegExp('\\b' + w + '\\b', 'g'), String(n));
  return t.replace(/\s+/g, ' ');
}
/**
 * @param {string} raw
 * @returns {{ rounds?: number, roundSec?: number, restSec?: number, tooMany?: number }}
 */
export function parseReferee(raw) {
  const t = normalize(raw);
  const out = {};
  const r = t.match(/(\d+)\s*(?:rounds?|reprises?|manches?)\b/);
  if (r && +r[1] >= 1 && +r[1] <= 4) out.rounds = +r[1];
  else if (r && +r[1] > 4) out.tooMany = +r[1]; // 4 reprises au maximum en compétition (I 2.3.1)

  const durRe = /(\d+)\s*(?:minutes?|mins?|mn|'|:)(?:\s*(?:et\s+)?(demie?|\d{2})(?!\d))?(?:\s*(?:secondes?|sec|s)\b)?|(\d+)\s*(?:secondes?|sec|s)\b/g;
  const durs = [];
  let m;
  while ((m = durRe.exec(t))) {
    let sec;
    if (m[3]) sec = +m[3];
    else sec = +m[1] * 60 + (m[2] ? (m[2].startsWith('dem') ? 30 : +m[2]) : 0);
    if (sec > 0 && sec <= 600) durs.push({ sec, pos: m.index, end: m.index + m[0].length });
  }
  const pm = t.match(/\b(pause|repos|recuperation|recup)\b/);
  if (pm && durs.length) {
    const p = pm.index ?? 0, pEnd = p + pm[0].length;
    /** @typedef {{ sec: number, pos: number, end: number }} Dur */
    // « pause de 1 minute » ou « 1 minute de pause », sinon la durée la plus proche du mot
    const gapAfter = (/** @type {Dur} */ d) => d.pos >= pEnd ? t.slice(pEnd, d.pos) : null;
    const gapBefore = (/** @type {Dur} */ d) => d.end <= p ? t.slice(d.end, p) : null;
    let best = durs.find(d => /^\s*(de|d)?\s*$/.test(gapAfter(d) ?? 'x')) ||
               durs.find(d => /^\s*(de|d)?\s*$/.test(gapBefore(d) ?? 'x'));
    if (!best && durs.length > 1) {
      const dist = (/** @type {Dur} */ d) => Math.min(Math.abs(d.pos - pEnd), Math.abs(d.end - p));
      best = durs.reduce((a, d) => dist(d) < dist(a) ? d : a);
    }
    if (best) { out.restSec = best.sec; durs.splice(durs.indexOf(best), 1); }
  }
  if (durs.length) out.roundSec = durs[0].sec;
  return out;
}

// ---------- Commandes vocales ----------
// Comparaison « phonétique » grossière : « allez », « aller », « allé », « hallez », « à les », « à l'est »… → « ale »
/** @param {string} text */
export function phonWords(text) {
  return normalize(text).replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean).map(w => w
    .replace(/h/g, '').replace(/(.)\1+/g, '$1')
    .replace(/(ez|er|ais|ait|ai|est|es|et|ey|e)$/, 'e'));
}
/** @param {string} text */
export function phon(text) {
  const ws = phonWords(text);
  return (ws.every(w => w === ws[0]) ? [ws[0]] : ws).join(''); // « allez allez » = « allez »
}
/** @type {{ name: CommandName, re: RegExp }[]} */
export const COMMAND_PATTERNS = [
  { name: 'STOP', re: /^e?s?tope?$|^stopez$/ },
  { name: 'ALLEZ', re: /^ale(y|i)?$|^ole$/ },
  { name: 'REPOS', re: /^re?po(s|t)?$/ },
];
export const EN_GARDE = /^[ae]ngu?ard?e$/; // « en garde », « an garde », « en gare »
// Découpe un commandement de l'arbitre : « en garde » éventuel, puis une commande courte, avec la fin
// protocolaire « … fin de la reprise / fin de l'assaut » ignorée (I 3.2.2)
// learned : variantes apprises par commande, ex. { ALLEZ: ['alo'] }
// Mots de la fin protocolaire : « fin de la reprise », « fin de l'assaut », « … et de l'assaut » (après phonétique)
export const END_WORDS = new Set(['fin', 'de', 'd', 'la', 'l', 'reprise', 'asaut', 'e']);
// Découpe un commandement de l'arbitre : « en garde » éventuel, puis une commande courte, puis la fin
// protocolaire éventuelle. end vaut 'reprise' ou 'assaut' quand l'arbitre termine la reprise (I 3.2.2).
/**
 * @param {string} text
 * @param {Partial<Learned>} [learned]
 * @returns {{ enGarde: boolean, cmd: CommandName | null, end: 'reprise' | 'assaut' | null } | null}
 */
export function parseCommand(text, learned = {}) {
  let ws = phonWords(text);
  /** @type {'reprise' | 'assaut' | null} */
  let end = null;
  const f = ws.findIndex((w, i) => w === 'fin' && ws.slice(i).some(x => x === 'reprise' || x === 'asaut'));
  if (f >= 0 && ws.slice(f).every(w => END_WORDS.has(w))) {
    end = ws.slice(f).includes('asaut') ? 'assaut' : 'reprise';
    ws = ws.slice(0, f);
  }
  let enGarde = false;
  if (ws.length >= 2 && EN_GARDE.test(ws[0] + ws[1])) { enGarde = true; ws = ws.slice(2); }
  else if (ws.length >= 1 && EN_GARDE.test(ws[0])) { enGarde = true; ws = ws.slice(1); }
  if (!ws.length) return end ? { enGarde, cmd: 'STOP', end } : enGarde ? { enGarde, cmd: null, end } : null;
  if (ws.length > 3) return null; // une commande est un mot court, pas une phrase
  const p = (ws.every(w => w === ws[0]) ? [ws[0]] : ws).join('');
  const cmd = COMMAND_PATTERNS.find(c => c.re.test(p) || (learned[c.name] || []).includes(p));
  return cmd ? { enGarde, cmd: cmd.name, end } : null;
}
// « Chrono, prêt ? » (contrôle des officiels avant chaque reprise)
/** @param {string} text */
export const isReadyCheck = text => /\bchrono\w*\b.*\bpret\b/.test(normalize(text).replace(/[^a-z0-9 ]/g, ' '));
// Motif d'un arrêt annoncé par l'arbitre (I 4.2.8 à 4.2.13), avec la couleur du tireur concerné
/** @param {string} text @param {string[]} [colors] @returns {Motif | null} */
export function parseMotif(text, colors = []) {
  const t = normalize(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  /** @type {Motif | null} */
  let e = null;
  if (/carton rouge/.test(t)) e = { type: 'carton-rouge', pts: 2 };
  else if (/carton jaune/.test(t)) e = { type: 'carton-jaune', pts: 2 };
  else if (/avertissement refuse/.test(t)) e = { type: 'avert-refuse', pts: 0 };
  else if (/avertissement prononce/.test(t)) e = { type: 'avertissement', pts: 2 };
  else if (/\bdemande (de |d )?d?(avertissement|disqualification)\b/.test(t)) e = { type: 'demande-avert', pts: 0 }; // « demande d'avertissement », « demande de disqualification »
  else if (/\bdisqualification\b/.test(t)) e = { type: 'disqualification', pts: 0 };
  else if (/\bpenalite\b/.test(t)) e = { type: 'penalite', pts: 1,
    detail: /sortie d? ?aire/.test(t) ? "sortie d'aire" : /lache\w* (de )?(la )?canne/.test(t) ? 'lâcher de canne'
      : /equipement/.test(t) ? 'équipement' : /retard/.test(t) ? 'retard' : null };
  else if (/\bobservation\b/.test(t)) e = { type: 'observation', pts: 0 };
  else if (/\babandon\b/.test(t)) e = { type: 'abandon', pts: 0 };
  else if (/\bforfait\b/.test(t)) e = { type: 'forfait', pts: 0 };
  if (!e) return null;
  const tc = t.replace(/carton (jaune|rouge)/g, ''); // « carton jaune » n'est pas le tireur jaune
  e.color = colors.find(c => c && new RegExp('\\b' + normalize(c) + '\\b').test(tc)) || null;
  return e;
}

// Ce que l'arbitre doit dire pendant la minute de repos, étape par étape (C7, I 3.2.1 et I 3.2.2) : sous-titre de l'écran (#43)
const REST_CUES = /** @type {const} */ ([[5, 'Juge 1, prêt ? … Chrono, prêt ?'], [15, 'Tireurs au centre'], [30, 'Tireurs, équipez-vous']]);
/** La dernière étape atteinte, d'après le temps de repos restant ; null avant 30 s @param {number} remaining @returns {string | null} */
export function restCue(remaining) {
  const cue = REST_CUES.find(([sec]) => remaining <= sec);
  return cue ? cue[1] : null;
}

/** « Rappel, tireur bleu » : retard d'un tireur à l'appel de la reprise (C15). null si ce n'est pas un rappel.
 * @param {string} text @param {string[]} [colors] @returns {{ color: string | null } | null} */
export function parseRappel(text, colors = []) {
  const t = normalize(text).replace(/[^a-z0-9 ]/g, ' ');
  if (!/\brappels?\b/.test(t)) return null;
  return { color: colors.find(c => c && new RegExp('\\b' + normalize(c) + '\\b').test(t)) || null };
}

/**
 * Ce que l'app comprend d'une phrase, indépendamment de la phase (même ordre de décision que js/voice.js).
 * Sert au corpus de phrases réelles (tests/corpus) et au journal vocal.
 * @param {string} text @param {Partial<Learned>} [learned] @param {string[]} [colors]
 * @returns {{ kind: 'ready' } | { kind: 'engarde' } | { kind: 'command', cmd: CommandName, enGarde: boolean, end: 'reprise' | 'assaut' | null }
 *   | { kind: 'rappel', color: string | null } | ({ kind: 'motif' } & Motif) | ({ kind: 'referee' } & ReturnType<typeof parseReferee>) | { kind: 'none' }}
 */
export function classify(text, learned = {}, colors = []) {
  if (isReadyCheck(text)) return { kind: 'ready' };
  const c = parseCommand(text, learned);
  if (c) return c.cmd ? { kind: 'command', cmd: c.cmd, enGarde: c.enGarde, end: c.end } : { kind: 'engarde' };
  const rp = parseRappel(text, colors);
  if (rp) return { kind: 'rappel', ...rp };
  const m = parseMotif(text, colors);
  if (m) return { kind: 'motif', ...m };
  const r = parseReferee(text);
  if (r.rounds || r.roundSec || r.tooMany) return { kind: 'referee', ...r };
  return { kind: 'none' };
}
