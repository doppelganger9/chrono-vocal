// Ce que l'arbitre dit → commandes du chrono, sanctions, réglages. ADR 0005 (mots courts) et 0006 (l'arbitre décide).
// Ce que veut dire une phrase vient de classify (js/lang.js), testé par le corpus de phrases réelles ; ce module décide
// seulement quoi en faire selon la phase (#58).
import { classify, parseReferee, phon, buildSentence } from "./lang.js";
import { EVENT_LABELS, eventLabel } from "./stats.js";

/** @typedef {import('./types.js').Config} Config @typedef {import('./types.js').CommandName} CommandName @typedef {import('./types.js').Motif} Motif */
/** @typedef {ReturnType<typeof classify>} Meaning */

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
export function createVoice({
  getCfg,
  updateCfg,
  chrono,
  command,
  commands,
  endReprise,
  rappel,
  speech,
  ui,
  onReferee,
  now = () => Date.now(),
  journal,
}) {
  /** Ce que l'app a fait de la dernière phrase, pour le journal vocal */
  let action = "";
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
    readyPending = -1;
    lastChronoAt = 0;
    if (getCfg().answerReady) {
      speech.say("Prêt", { relisten: true });
      ui.showHeard("🎙 Chrono, prêt ? → « Prêt »");
    }
  }

  // Un commandement : « en garde » éventuel, puis une commande courte. Renvoie 'engarde' si seul « en garde » a été dit
  /** @param {Extract<Meaning, { kind: 'command' }> | { kind: 'engarde' }} c @param {string} text @returns {true | 'engarde'} */
  function doCommand(c, text) {
    if (c.kind === "engarde") {
      lastEnGarde = now();
      action = "EN GARDE";
      ui.showHeard("🎙 EN GARDE");
      ui.render();
      return "engarde";
    }
    if (c.enGarde) lastEnGarde = now();
    // « Stop, fin de la reprise / de l'assaut » : l'arbitre termine la reprise
    if (c.end) {
      const name = c.end === "assaut" ? "FIN DE L'ASSAUT" : "FIN DE REPRISE";
      if (command(name, endReprise)) {
        action = name;
        ui.showHeard("🎙 " + name + " (« " + text.trim() + " »)");
      } else {
        action = name + " sans effet";
        ui.showHeard(`🎙 ${name} entendu — sans effet : ${ui.phaseText()}`);
      }
      return true;
    }
    // « allez » est toujours précédé de « en garde » (I 4.2.6.1) : filtre contre le public et les aires voisines
    if (
      c.cmd === "ALLEZ" &&
      getCfg().requireEnGarde &&
      now() - lastEnGarde > 10000
    ) {
      action = "ALLEZ ignoré (pas de « en garde »)";
      ui.showHeard("🎙 ALLEZ ignoré : pas de « en garde » juste avant");
      return true;
    }
    // aucun commandement ignoré sans le dire
    if (commands[c.cmd]()) {
      action = c.cmd;
      ui.showHeard("🎙 " + c.cmd + " (« " + text.trim() + " »)");
    } else {
      action = c.cmd + " sans effet";
      ui.showHeard(`🎙 ${c.cmd} entendu — sans effet : ${ui.phaseText()}`);
    }
    return true;
  }

  // « Rappel, tireur bleu » : le texte affiché vient de deps.rappel
  /** @param {string | null} color */
  function doRappel(color) {
    if (!color) {
      action = "rappel sans tireur";
      ui.showHeard(
        `🎙 Rappel entendu — quel tireur ? (${getCfg().colors.join(", ")})`,
      );
    } else if (rappel(color)) action = "rappel " + color;
    else {
      action = "rappel sans effet";
      ui.showHeard(`🎙 Rappel entendu — sans effet : ${ui.phaseText()}`);
    }
  }

  /** @param {Motif} e */
  function doMotif(e) {
    let label = "";
    command(EVENT_LABELS[e.type].toUpperCase(), () => {
      label = eventLabel(chrono.addEvent(e));
    });
    action = "sanction : " + label;
    ui.showHeard("📝 " + label);
  }

  // Format de l'assaut dit par l'arbitre : seulement hors reprise. false si la phrase n'en contient pas
  /** @param {ReturnType<typeof parseReferee>} p @returns {boolean} */
  function doReferee(p) {
    if (chrono.state.running) return false;
    action = "réglages";
    if (p.tooMany) {
      ui.showHeard(`⚠️ ${p.tooMany} reprises : 4 au maximum`);
      speech.say("Quatre reprises au maximum");
      return true;
    }
    if (!p.rounds && !p.roundSec) return false;
    onReferee(p);
    ui.showHeard("✅ " + buildSentence(getCfg()));
    speech.say("Compris. " + buildSentence(getCfg()).replace(/^Pour un/, "Un"));
    return true;
  }

  // Une phrase finie qui n'est pas un commandement : rappel, sanction (l'assaut commencé), ou format de l'assaut
  /** @param {Meaning} m @param {string} text @returns {boolean} true si la phrase a servi */
  function doSentence(m, text) {
    if (m.kind === "rappel") {
      doRappel(m.color);
      return true;
    }
    if (m.kind === "motif" && chrono.bout.start) {
      const { kind, ...e } = m;
      doMotif(e);
      return true;
    }
    if (m.kind === "referee") {
      const { kind, ...p } = m;
      return doReferee(p);
    } // les réglages seulement, sans « kind »
    // une sanction avant l'assaut n'a rien à quoi se rattacher ; la phrase peut encore porter le format de l'assaut
    return m.kind === "motif" ? doReferee(parseReferee(text)) : false;
  }

  // Mots courts entendus mais non reconnus, pour les apprendre depuis les réglages
  /** @param {string} text */
  function noteUnheard(text) {
    const t = text.trim();
    if (
      !t ||
      t.split(/\s+/).length > 3 ||
      unheard.some((u) => phon(u) === phon(t))
    )
      return;
    unheard.unshift(t);
    unheard = unheard.slice(0, 8);
  }

  /** Un résultat de la reconnaissance @param {string[]} alts @param {boolean} isFinal @param {number} index sa position dans la session d'écoute */
  function onResult(alts, isFinal, index) {
    if (firedFor.has(index)) return;
    const phase = chrono.state.phase;
    const note = () => journal?.add({ alts, final: isFinal, phase, action });
    const cfg = getCfg();
    const meanings = alts.map((a) => classify(a, cfg.learned, cfg.colors));
    const has = (/** @type {Meaning['kind']} */ kind) =>
      meanings.some((m) => m.kind === kind);
    action = "";
    if (
      has("ready") ||
      (now() - lastChronoAt < 4000 && has("pret")) ||
      readyPending === index
    ) {
      if (!isFinal) {
        readyPending = index;
        ui.showHeard("🎙 Chrono, prêt ?");
        return;
      }
      firedFor.add(index);
      answerReady();
      action = "Prêt";
      note();
      return;
    }
    // « Chrono » seul, en phrase finie : la suite (« prêt ») arrive souvent à part (#47)
    if (isFinal && has("chrono")) {
      firedFor.add(index);
      lastChronoAt = now();
      action = "Chrono…";
      ui.showHeard("🎙 Chrono…");
      note();
      return;
    }
    // un commandement peut venir de n'importe quelle alternative. « en garde » seul ne consomme pas le résultat :
    // la suite (« … allez ») peut arriver dans le même résultat
    /** @type {boolean | 'engarde'} */
    let heard = false;
    for (let i = 0; i < alts.length; i++) {
      const m = meanings[i];
      if (m.kind !== "command" && m.kind !== "engarde") continue;
      const r = doCommand(m, alts[i]);
      if (r === true) {
        heard = true;
        break;
      }
      heard = "engarde";
    }
    if (heard === true) {
      firedFor.add(index);
      note();
      return;
    }
    if (isFinal) {
      firedFor.add(index);
      if (heard === "engarde" || doSentence(meanings[0], alts[0])) {
        note();
        return;
      }
      action = "non reconnu";
      note();
      ui.showHeard("… " + alts[0]);
      noteUnheard(alts[0]);
    } else if (!heard) {
      ui.showHeard("… " + alts[0]);
    }
  }

  return {
    onResult,
    // nouvelle écoute : une question « Chrono, prêt ? » restée sans résultat final reçoit sa réponse
    onRestart() {
      firedFor = new Set();
      if (readyPending >= 0) answerReady();
    },
    get lastEnGarde() {
      return lastEnGarde;
    },
    get unheard() {
      return unheard;
    },
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
      learned[cmd] = (learned[cmd] || []).filter((x) => x !== word);
      updateCfg({ learned });
    },
  };
}
