// Voix du navigateur : synthèse (annonces) et reconnaissance (commandements de l'arbitre). ADR 0002.
//
// window.__chronoEnv.echoGuardMs : délai pendant lequel l'app ignore le micro après avoir parlé (400 ms par défaut,
// pour ne pas s'entendre elle-même). Les tests le mettent à 0.
export function createSpeech(win = window) {
  const synth = win.speechSynthesis;
  const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
  const echoGuardMs = win.__chronoEnv?.echoGuardMs ?? 400;
  let frVoice = null, speakingUntil = 0, unlocked = false;
  const pending = new Set(); // garde une référence : Chrome perd les annonces dont l'objet est libéré par le ramasse-miettes

  function pickVoice() {
    const vs = synth ? synth.getVoices() : [];
    frVoice = vs.find(v => v.lang === 'fr-FR' && v.localService) || vs.find(v => v.lang.startsWith('fr')) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function say(text) {
    if (!synth) return;
    const u = new win.SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 1.05; if (frVoice) u.voice = frVoice;
    speakingUntil = Date.now() + 600 + text.length * 90;
    u.onend = u.onerror = () => { pending.delete(u); speakingUntil = Date.now() + echoGuardMs; };
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
  let rec = null, listening = false;
  /** onResult(alternatives[], isFinal, index) ; onRestart() quand l'écoute repart à zéro ; onDenied() si le micro est refusé */
  function listen({ onResult, onRestart = () => {}, onDenied }) {
    rec = new SR();
    rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onresult = e => {
      if (Date.now() < speakingUntil) return; // on ignore notre propre voix
      for (let i = e.resultIndex; i < e.results.length; i++) {
        onResult(Array.from(e.results[i]).map(a => a.transcript), e.results[i].isFinal, i);
      }
    };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { listening = false; onDenied(); } };
    rec.onend = () => { onRestart(); if (listening) { try { rec.start(); } catch {} } };
    listening = true;
    try { rec.start(); } catch {}
  }
  function stopListening() { listening = false; try { rec && rec.stop(); } catch {} }

  return {
    canListen: !!SR,
    get listening() { return listening; },
    say, unlock, listen, stopListening,
    cancel() { if (synth) synth.cancel(); },
  };
}
