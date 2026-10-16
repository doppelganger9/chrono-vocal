// Ce que l'arbitre dit → commandes du chrono, sanctions, réglages. ADR 0005 (mots courts) et 0006 (l'arbitre décide).
import { parseCommand, parseMotif, parseReferee, isReadyCheck, phon, buildSentence } from './lang.js';
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
 * @param {{ say: (text: string) => void }} deps.speech
 * @param {{ showHeard: (t: string) => void, phaseText: () => string, render: () => void }} deps.ui
 * @param {(p: ReturnType<typeof parseReferee>) => void} deps.onReferee  réglages lus dans la phrase de l'arbitre
 * @param {() => number} [deps.now]
 */
export function createVoice({ getCfg, updateCfg, chrono, command, commands, endReprise, speech, ui, onReferee, now = () => Date.now() }) {
  let lastEnGarde = 0;
  /** @type {Set<number>} */
  let firedFor = new Set();
  /** @type {string[]} */
  let unheard = [];

  // Renvoie true si une commande a été traitée, 'engarde' si seul « en garde » a été entendu
  /** @param {string} text @returns {boolean | 'engarde'} */
  function tryCommand(text) {
    const r = parseCommand(text, getCfg().learned);
    if (!r) return false;
    if (r.enGarde) lastEnGarde = now();
    if (!r.cmd) { ui.showHeard('🎙 EN GARDE'); ui.render(); return 'engarde'; }
    // « Stop, fin de la reprise / de l'assaut » : l'arbitre termine la reprise
    if (r.end) {
      const name = r.end === 'assaut' ? "FIN DE L'ASSAUT" : 'FIN DE REPRISE';
      if (command(name, endReprise)) ui.showHeard('🎙 ' + name + ' (« ' + text.trim() + ' »)');
      else ui.showHeard(`🎙 ${name} entendu — sans effet : ${ui.phaseText()}`);
      return true;
    }
    // « allez » est toujours précédé de « en garde » (I 4.2.6.1) : filtre contre le public et les aires voisines
    if (r.cmd === 'ALLEZ' && getCfg().requireEnGarde && now() - lastEnGarde > 10000) {
      ui.showHeard('🎙 ALLEZ ignoré : pas de « en garde » juste avant'); return true;
    }
    // aucun commandement ignoré sans le dire
    if (commands[r.cmd]()) ui.showHeard('🎙 ' + r.cmd + ' (« ' + text.trim() + ' »)');
    else ui.showHeard(`🎙 ${r.cmd} entendu — sans effet : ${ui.phaseText()}`);
    return true;
  }

  /** @param {string} text */
  function tryMotif(text) {
    if (!chrono.bout.start) return false;
    const e = parseMotif(text, getCfg().colors);
    if (!e) return false;
    let label = '';
    command(EVENT_LABELS[e.type].toUpperCase(), () => { label = eventLabel(chrono.addEvent(e)); });
    ui.showHeard('📝 ' + label);
    return true;
  }

  /** @param {string} text */
  function tryReferee(text) {
    if (chrono.state.running) return false;
    const p = parseReferee(text);
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
    if (alts.some(isReadyCheck)) {
      firedFor.add(index);
      if (getCfg().answerReady) { speech.say('Prêt'); ui.showHeard('🎙 Chrono, prêt ? → « Prêt »'); }
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
    if (heard === true) { firedFor.add(index); return; }
    if (isFinal) {
      firedFor.add(index);
      if (heard === 'engarde' || tryMotif(alts[0]) || tryReferee(alts[0])) return;
      ui.showHeard('… ' + alts[0]); noteUnheard(alts[0]);
    } else if (!heard) {
      ui.showHeard('… ' + alts[0]);
    }
  }

  return {
    onResult,
    onRestart() { firedFor = new Set(); },
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
