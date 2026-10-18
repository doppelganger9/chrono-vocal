// Voix du navigateur : synthèse (annonces) et reconnaissance (commandements de l'arbitre). ADR 0002.
//
// window.__chronoEnv.echoGuardMs : délai pendant lequel l'app ignore le micro après avoir parlé (400 ms par défaut,
// pour ne pas s'entendre elle-même). Les tests le mettent à 0.
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
 * @typedef {Window & typeof globalThis & { SpeechRecognition?: new () => Recognition, webkitSpeechRecognition?: new () => Recognition, __chronoEnv?: { echoGuardMs?: number } }} SpeechWindow
 */

/** @param {SpeechWindow} [win] */
export function createSpeech(win = window) {
  const synth = win.speechSynthesis;
  const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
  const echoGuardMs = win.__chronoEnv?.echoGuardMs ?? 400;
  /** @type {SpeechSynthesisVoice | null} */
  let frVoice = null;
  let speakingUntil = 0, unlocked = false;
  const pending = new Set(); // garde une référence : Chrome perd les annonces dont l'objet est libéré par le ramasse-miettes

  function pickVoice() {
    const vs = synth ? synth.getVoices() : [];
    frVoice = vs.find(v => v.lang === 'fr-FR' && v.localService) || vs.find(v => v.lang.startsWith('fr')) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  /** @param {string} text @param {{ relisten?: boolean }} [opts]  relisten : relancer l'écoute une fois l'annonce finie (#30) */
  function say(text, { relisten = false } = {}) {
    if (!synth) return;
    const u = new win.SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 1.05; if (frVoice) u.voice = frVoice;
    speakingUntil = Date.now() + 600 + text.length * 90;
    u.onend = u.onerror = () => {
      pending.delete(u); speakingUntil = Date.now() + echoGuardMs;
      // iOS peut laisser la reconnaissance figée après une annonce (voyant allumé, plus aucun résultat) :
      // l'arrêter la fait repartir aussitôt (onend → start)
      if (relisten && listening && rec) { try { rec.stop(); } catch {} }
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
  /** onResult(alternatives[], isFinal, index) ; onRestart() quand l'écoute repart à zéro ; onDenied() si le micro est refusé */
  /**
   * @param {object} handlers
   * @param {(alternatives: string[], isFinal: boolean, index: number) => void} handlers.onResult
   * @param {() => void} [handlers.onRestart]
   * @param {() => void} handlers.onDenied
   */
  function listen({ onResult, onRestart = () => {}, onDenied }) {
    if (!SR) return;
    const r = new SR();
    rec = r;
    r.lang = 'fr-FR'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    r.onresult = e => {
      if (Date.now() < speakingUntil) return; // on ignore notre propre voix
      for (let i = e.resultIndex; i < e.results.length; i++) {
        onResult(Array.from(e.results[i]).map(a => a.transcript), e.results[i].isFinal, i);
      }
    };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { listening = false; onDenied(); } };
    r.onend = () => { onRestart(); if (listening) { try { r.start(); } catch {} } };
    listening = true;
    try { r.start(); } catch {}
  }
  function stopListening() { listening = false; try { rec && rec.stop(); } catch {} }

  return {
    canListen: !!SR,
    get listening() { return listening; },
    say, unlock, listen, stopListening,
    cancel() { if (synth) synth.cancel(); },
  };
}
