// Sons : bips et gong, synthétisés (Web Audio, aucun fichier).
export function createAudio(win = window) {
  let actx = null;
  /** Crée ou réveille le contexte audio ; à appeler depuis un toucher (exigence d'iOS) */
  function ctx() {
    if (!actx) actx = new (win.AudioContext || win.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq = 880, dur = 0.15, when = 0, vol = 0.5) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = freq; o.type = 'square';
    g.gain.setValueAtTime(vol, a.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
    o.connect(g).connect(a.destination); o.start(a.currentTime + when); o.stop(a.currentTime + when + dur);
  }
  // Gong : un coup de cloche (fondamentale + partiels inharmoniques, longue décroissance)
  function gong() {
    const a = ctx(), t = a.currentTime;
    [[1, 0.6, 3], [2.76, 0.25, 1.8], [5.4, 0.12, 1], [8.93, 0.06, 0.6]].forEach(([ratio, vol, decay]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = 200 * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + decay);
    });
  }
  return { unlock: ctx, beep, gong };
}
