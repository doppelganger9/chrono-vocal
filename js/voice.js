// Ce que l'arbitre dit → commandes du chrono, sanctions, réglages. ADR 0005 (mots courts) et 0006 (l'arbitre décide).
import { parseCommand, parseRappel, parseMotif, parseReferee, isReadyCheck, isChronoCall, isPretAlone, phon, buildSentence } from './lang.js';
import { EVENT_LABELS, eventLabel } from './stats.js';

/** @typedef {import('./types.js').Config} Config @typedef {import('./types.js').CommandName} CommandName */

/**
 * @param {object} deps
 * @param {() => Config} deps.getCfg
 * @param {(c: Partial<Config>) => void} deps.updateCfg  enregistre des réglages partiels
 * @param {ReturnType<typeof import('./chrono.js').createChrono>} deps.chrono
 * @param {(name: string, fn: () => unknown) => boolean} deps.command  exécute une action annulable
 * @param {Record<CommandName, () => boolean>} deps.commands  exécutent la commande, true si elle a eu un effet
 * @param {() => boolean} deps.endReprise
 * @param {(color: string) => boolean} deps.rappel  rappel d'un tireur à l'appel de la reprise (C15)
 * @param {{ say: (text: string, opts?: { relisten?: boolean }) => void }} deps.speech
 * @param {{ showHeard: (t: string) => void, phaseText: () => string, render: () => void }} deps.ui
 * @param {(p: ReturnType<typeof parseReferee>) => void} deps.onReferee  réglages lus dans la phrase de l'arbitre
 * @param {() => number} [deps.now]
 * @param {{ add: (e: { alts: string[], final: boolean, phase: string, action: string }) => void }} [deps.journal]  journal vocal (#3)
 */
export function createVoice({ getCfg, updateCfg, chrono, command, commands, endReprise, rappel, speech, ui, onReferee, now = () => Date.now(), journal }) {
  /** Ce que l'app a fait de la dernière phrase, pour le journal vocal */
  let action = '';
  let lastEnGarde = 0;
  /** @type {Set<number>} */
  let firedFor = new Set();
  /** @type {string[]} */
  let unheard = [];
  /** « Chrono, prêt ? » entendu dans un résultat provisoire : la réponse attend la fin de la phrase (#30) */
  let readyPending = -1;
  /** heure d'un « Chrono » entendu seul : « prêt » peut arriver dans la phrase suivante (#47) */
  let lastChronoAt = 0;

  // Répondre pendant que la reconnaissance écoute encore la même phrase bloquait le micro sur iPhone (#30) :
  // on répond une fois la phrase finie, puis l'écoute est relancée
  function answerReady() {
    readyPending = -1; lastChronoAt = 0;
    if (getCfg().answerReady) { speech.say('Prêt', { relisten: true }); ui.showHeard('🎙 Chrono, prêt ? → « Prêt »'); }
  }

  // Renvoie true si une commande a été traitée, 'engarde' si seul « en garde » a été entendu
  /** @param {string} text @returns {boolean | 'engarde'} */
  function tryCommand(text) {
    const r = parseCommand(text, getCfg().learned);
    if (!r) return false;
    if (r.enGarde) lastEnGarde = now();
    if (!r.cmd) { action = 'EN GARDE'; ui.showHeard('🎙 EN GARDE'); ui.render(); return 'engarde'; }
    // « Stop, fin de la reprise / de l'assaut » : l'arbitre termine la reprise
    if (r.end) {
      const name = r.end === 'assaut' ? "FIN DE L'ASSAUT" : 'FIN DE REPRISE';
      if (command(name, endReprise)) { action = name; ui.showHeard('🎙 ' + name + ' (« ' + text.trim() + ' »)'); }
      else { action = name + ' sans effet'; ui.showHeard(`🎙 ${name} entendu — sans effet : ${ui.phaseText()}`); }
      return true;
    }
    // « allez » est toujours précédé de « en garde » (I 4.2.6.1) : filtre contre le public et les aires voisines
    if (r.cmd === 'ALLEZ' && getCfg().requireEnGarde && now() - lastEnGarde > 10000) {
      action = 'ALLEZ ignoré (pas de « en garde »)';
      ui.showHeard('🎙 ALLEZ ignoré : pas de « en garde » juste avant'); return true;
    }
    // aucun commandement ignoré sans le dire
    if (commands[r.cmd]()) { action = r.cmd; ui.showHeard('🎙 ' + r.cmd + ' (« ' + text.trim() + ' »)'); }
    else { action = r.cmd + ' sans effet'; ui.showHeard(`🎙 ${r.cmd} entendu — sans effet : ${ui.phaseText()}`); }
    return true;
  }

  // « Rappel, tireur bleu » : le texte affiché vient de deps.rappel
  /** @param {string} text */
  function tryRappel(text) {
    const r = parseRappel(text, getCfg().colors);
    if (!r) return false;
    if (!r.color) { action = 'rappel sans tireur'; ui.showHeard(`🎙 Rappel entendu — quel tireur ? (${getCfg().colors.join(', ')})`); }
    else if (rappel(r.color)) action = 'rappel ' + r.color;
    else { action = 'rappel sans effet'; ui.showHeard(`🎙 Rappel entendu — sans effet : ${ui.phaseText()}`); }
    return true;
  }

  /** @param {string} text */
  function tryMotif(text) {
    if (!chrono.bout.start) return false;
    const e = parseMotif(text, getCfg().colors);
    if (!e) return false;
    let label = '';
    command(EVENT_LABELS[e.type].toUpperCase(), () => { label = eventLabel(chrono.addEvent(e)); });
    action = 'sanction : ' + label;
    ui.showHeard('📝 ' + label);
    return true;
  }

  /** @param {string} text */
  function tryReferee(text) {
    if (chrono.state.running) return false;
    const p = parseReferee(text);
    action = 'réglages';
    if (p.tooMany) { ui.showHeard(`⚠️ ${p.tooMany} reprises : 4 au maximum`); speech.say('Quatre reprises au maximum'); return true; }
    if (!p.rounds && !p.roundSec) return false;
    onReferee(p);
    ui.showHeard('✅ ' + buildSentence(getCfg()));
    speech.say('Compris. ' + buildSentence(getCfg()).replace(/^Pour un/, 'Un'));
    return true;
  }

  // Mots courts entendus mais non reconnus, pour les apprendre depuis les réglages
  /** @param {string} text */
  function noteUnheard(text) {
    const t = text.trim();
    if (!t || t.split(/\s+/).length > 3 || unheard.some(u => phon(u) === phon(t))) return;
    unheard.unshift(t); unheard = unheard.slice(0, 8);
  }

  /** Un résultat de la reconnaissance @param {string[]} alts @param {boolean} isFinal @param {number} index sa position dans la session d'écoute */
  function onResult(alts, isFinal, index) {
    if (firedFor.has(index)) return;
    const phase = chrono.state.phase;
    const note = () => journal?.add({ alts, final: isFinal, phase, action });
    action = '';
    const pretAfterChrono = now() - lastChronoAt < 4000 && alts.some(isPretAlone);
    if (alts.some(isReadyCheck) || pretAfterChrono || readyPending === index) {
      if (!isFinal) { readyPending = index; ui.showHeard('🎙 Chrono, prêt ?'); return; }
      firedFor.add(index);
      answerReady();
      action = 'Prêt'; note();
      return;
    }
    // « Chrono » seul, en phrase finie : la suite (« prêt ») arrive souvent à part (#47)
    if (isFinal && alts.some(isChronoCall)) {
      firedFor.add(index); lastChronoAt = now();
      action = 'Chrono…'; ui.showHeard('🎙 Chrono…'); note();
      return;
    }
    // « en garde » seul ne consomme pas le résultat : la suite (« … allez ») peut arriver dans le même résultat
    /** @type {boolean | 'engarde'} */
    let heard = false;
    for (const a of alts) {
      const r = tryCommand(a);
      if (r === true) { heard = true; break; }
      if (r === 'engarde') heard = 'engarde';
    }
    if (heard === true) { firedFor.add(index); note(); return; }
    if (isFinal) {
      firedFor.add(index);
      if (heard === 'engarde' || tryRappel(alts[0]) || tryMotif(alts[0]) || tryReferee(alts[0])) { note(); return; }
      action = 'non reconnu'; note();
      ui.showHeard('… ' + alts[0]); noteUnheard(alts[0]);
    } else if (!heard) {
      ui.showHeard('… ' + alts[0]);
    }
  }

  return {
    onResult,
    // nouvelle écoute : une question « Chrono, prêt ? » restée sans résultat final reçoit sa réponse
    onRestart() { firedFor = new Set(); if (readyPending >= 0) answerReady(); },
    get lastEnGarde() { return lastEnGarde; },
    get unheard() { return unheard; },
    /** @param {number} i @param {CommandName} cmd */
    learn(i, cmd) {
      const learned = { ...getCfg().learned };
      learned[cmd] = [...new Set([...(learned[cmd] || []), phon(unheard[i])])];
      unheard.splice(i, 1);
      updateCfg({ learned });
    },
    /** @param {string} word @param {CommandName} cmd */
    forget(word, cmd) {
      const learned = { ...getCfg().learned };
      learned[cmd] = (learned[cmd] || []).filter(x => x !== word);
      updateCfg({ learned });
    },
  };
}
