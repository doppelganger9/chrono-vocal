// Témoin « micro silencieux » (#56) : une ligne sous le chrono, qu'un toucher transforme en relance de l'écoute.
// Le bouton du micro passe aussi à l'orange (classe « stale ») et relance au lieu de couper.
import { $, $button } from './dom.js';
import { fmt } from '../lang.js';

/**
 * @param {object} deps
 * @param {ReturnType<typeof import('../mic-watch.js').createMicWatch>} deps.watch
 * @param {{ readonly listening: boolean }} deps.speech
 * @param {(silentMs: number) => void} deps.onSilence  début d'un épisode de silence, pour le journal
 * @param {() => void} deps.onRelaunch
 */
export function createMicIndicator({ watch, speech, onSilence, onRelaunch }) {
  let silent = false;
  function update() {
    const now = watch.isSilent(speech.listening);
    if (now && !silent) onSilence(watch.silentMs());
    silent = now;
    const b = $button('micStale');
    b.hidden = !silent;
    if (silent) b.textContent = `🎙 Micro silencieux depuis ${fmt(Math.floor(watch.silentMs() / 1000))} · relancer`;
    $('micBtn').classList.toggle('stale', silent);
  }
  $button('micStale').onclick = () => onRelaunch();
  return { update, get silent() { return silent; } };
}
