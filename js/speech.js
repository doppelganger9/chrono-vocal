// Voix du navigateur : synthèse (annonces) et reconnaissance (commandements de l'arbitre). ADR 0002.
import { isEcho } from './lang.js';
//
// window.__chronoEnv.echoGuardMs : délai pendant lequel l'app filtre sa propre voix après avoir parlé (400 ms par défaut).
// Les tests le mettent à 0. Seul ce qui ressemble à l'annonce est ignoré : l'arbitre peut parler en même temps (#45).
/**
 * Reconnaissance vocale : API non standard (absente des types du DOM), réduite ici à ce que l'app utilise.
 * @typedef {{ transcript: string }} Alternative
 * @typedef {ArrayLike<Alternative> & { isFinal: boolean }} RecognitionResult
 * @typedef {{ resultIndex: number, results: ArrayLike<RecognitionResult> }} RecognitionEvent
 * @typedef {object} Recognition
 * @property {string} lang
 * @property {boolean} continuous
 * @property {boolean} interimResults
 * @property {number} maxAlternatives
 * @property {((e: RecognitionEvent) => void) | null} onresult
 * @property {((e: { error: string }) => void) | null} onerror
 * @property {(() => void) | null} onend
 * @property {() => void} start
 * @property {() => void} stop
 * @property {() => void} [abort]
 * @typedef {Window & typeof globalThis & { SpeechRecognition?: new () => Recognition, webkitSpeechRecognition?: new () => Recognition, __chronoEnv?: { echoGuardMs?: number } }} SpeechWindow
 */

/** @param {SpeechWindow} [win] */
export function createSpeech(win = window) {
  const synth = win.speechSynthesis;
  const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
  const echoGuardMs = win.__chronoEnv?.echoGuardMs ?? 400;
  /** @type {SpeechSynthesisVoice | null} */
  let frVoice = null;
  let speakingUntil = 0, unlocked = false, lastSpoken = '';
  // iPhone et iPad (y compris un iPad qui se présente comme un Mac) : la reconnaissance peut s'y figer après une annonce
  const nav = win.navigator;
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  const pending = new Set(); // garde une référence : Chrome perd les annonces dont l'objet est libéré par le ramasse-miettes

  function pickVoice() {
    const vs = synth ? synth.getVoices() : [];
    frVoice = vs.find(v => v.lang === 'fr-FR' && v.localService) || vs.find(v => v.lang.startsWith('fr')) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  /** @param {string} text @param {{ relisten?: boolean }} [opts]  relisten : relancer l'écoute une fois l'annonce finie,
   *  même hors d'iOS (#30) */
  function say(text, { relisten = false } = {}) {
    if (!synth) return;
    const u = new win.SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 1.05; if (frVoice) u.voice = frVoice;
    speakingUntil = Date.now() + 600 + text.length * 90; lastSpoken = text;
    u.onend = u.onerror = () => {
      pending.delete(u); speakingUntil = Date.now() + echoGuardMs;
      // iOS peut laisser la reconnaissance figée après une annonce (voyant allumé, plus aucun résultat, #30 et #45) :
      // on repart sur une reconnaissance neuve. Pas ailleurs : sur Android, chaque démarrage fait un bip
      if (relisten || ios) relistenSoon();
    };
    pending.add(u);
    // cancel() suivi immédiatement de speak() fait perdre l'annonce sur Chrome : on attend un peu
    const go = () => { synth.resume(); synth.speak(u); };
    if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(go, 120); } else go();
  }
  // iOS / Safari n'autorisent la synthèse vocale qu'après une première annonce déclenchée par un toucher
  function unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new win.SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'fr-FR';
    synth.speak(u);
  }

  // Reconnaissance continue, relancée quand le navigateur l'arrête (Safari coupe après un silence)
  /** @type {Recognition | null} */
  let rec = null;
  let listening = false;
  /** l'arbitre est au milieu d'une phrase (résultat provisoire) : une relance la couperait */
  let inPhrase = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let relistenTimer = null;
  /** @type {{ onResult: (alternatives: string[], isFinal: boolean, index: number) => void, onRestart: () => void, onDenied: () => void }} */
  let handlers = { onResult() {}, onRestart() {}, onDenied() {} };

  function start() {
    if (!SR) return;
    const r = new SR();
    rec = r;
    r.lang = 'fr-FR'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    r.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alts = Array.from(e.results[i]).map(a => a.transcript);
        if (Date.now() < speakingUntil && isEcho(alts[0], lastSpoken)) continue; // notre propre voix
        inPhrase = !e.results[i].isFinal;
        handlers.onResult(alts, e.results[i].isFinal, i);
      }
    };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { listening = false; handlers.onDenied(); } };
    r.onend = () => { inPhrase = false; handlers.onRestart(); if (listening) { try { r.start(); } catch {} } };
    try { r.start(); } catch {}
  }
  // Nouvelle reconnaissance, une fois la phrase en cours de l'arbitre terminée (5 s au plus)
  function relistenSoon() {
    if (relistenTimer || !listening) return;
    let waited = 0;
    const attempt = () => {
      relistenTimer = null;
      if (!listening) return;
      if (inPhrase && waited < 5000) { waited += 250; relistenTimer = setTimeout(attempt, 250); return; }
      const old = rec;
      if (old) { old.onresult = old.onerror = old.onend = null; try { (old.abort || old.stop).call(old); } catch {} }
      inPhrase = false; handlers.onRestart(); start();
    };
    relistenTimer = setTimeout(attempt, 0);
  }
  /** onResult(alternatives[], isFinal, index) ; onRestart() quand l'écoute repart à zéro ; onDenied() si le micro est refusé */
  /**
   * @param {object} h
   * @param {(alternatives: string[], isFinal: boolean, index: number) => void} h.onResult
   * @param {() => void} [h.onRestart]
   * @param {() => void} h.onDenied
   */
  function listen({ onResult, onRestart = () => {}, onDenied }) {
    if (!SR) return;
    handlers = { onResult, onRestart, onDenied };
    listening = true;
    start();
  }
  function stopListening() { listening = false; try { rec && rec.stop(); } catch {} }

  return {
    canListen: !!SR,
    get listening() { return listening; },
    say, unlock, listen, stopListening,
    cancel() { if (synth) synth.cancel(); },
  };
}
