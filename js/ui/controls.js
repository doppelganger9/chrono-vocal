// Commandes à la main : bouton principal, annuler, télécommande Bluetooth ou clavier, mode tableau (#4).
import { $button } from './dom.js';

// Télécommande (télécommande de présentation, tourne-page) ou clavier :
// touche « suivant » = bouton principal, touche « précédent » = annuler
const NEXT_KEYS = [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown', 'MediaPlayPause', 'MediaTrackNext'];
const PREV_KEYS = ['PageUp', 'ArrowLeft', 'ArrowUp', 'Backspace', 'MediaTrackPrevious'];

/**
 * @param {object} deps
 * @param {() => void} deps.onMain  bouton principal (ALLEZ, STOP, REPRISE SUPPL.)
 * @param {() => void} deps.onUndo
 * @param {(key: string) => void} deps.onKey  touche de la télécommande, pour l'afficher
 * @param {() => boolean} deps.isBoard  mode tableau activé
 */
export function createControls({ onMain, onUndo, onKey, isBoard }) {
  $button('mainBtn').onclick = onMain;
  $button('undoBtn').onclick = onUndo;

  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(/** @type {HTMLElement} */ (e.target).tagName)) return;
    if (e.repeat) { e.preventDefault(); return; }
    if (NEXT_KEYS.includes(e.key)) { e.preventDefault(); onMain(); onKey(e.key); }
    else if (PREV_KEYS.includes(e.key)) { e.preventDefault(); onUndo(); }
  });
  // un bouton touché garde le focus : sans ça, Espace/Entrée le déclencherait une 2e fois
  document.addEventListener('click', e => { /** @type {HTMLElement} */ (e.target).closest('.controls button')?.closest('button')?.blur(); });

  // Mode tableau : un toucher sur le chrono affiche les boutons quelques secondes
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let controlsTimer;
  document.querySelector('main')?.addEventListener('click', () => {
    if (!isBoard()) return;
    document.body.dataset.controls = 'shown';
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => { delete document.body.dataset.controls; }, 8000);
  });
}
