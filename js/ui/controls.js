// Commandes à la main : bouton principal, annuler, télécommande Bluetooth ou clavier, mode tableau (#4).
import { $button } from "./dom.js";

// Télécommande (télécommande de présentation, tourne-page) ou clavier :
// touche « suivant » = bouton principal, touche « précédent » = annuler
const NEXT_KEYS = [
  " ",
  "Enter",
  "PageDown",
  "ArrowRight",
  "ArrowDown",
  "MediaPlayPause",
  "MediaTrackNext",
];
const PREV_KEYS = [
  "PageUp",
  "ArrowLeft",
  "ArrowUp",
  "Backspace",
  "MediaTrackPrevious",
];

/**
 * @param {object} deps
 * @param {() => void} deps.onMain  bouton principal (ALLEZ, STOP, REPRISE SUPPL.)
 * @param {() => void} deps.onUndo
 * @param {(key: string) => void} deps.onKey  touche de la télécommande, pour l'afficher
 * @param {() => boolean} deps.isBoard  mode tableau activé
 */
export function createControls({ onMain, onUndo, onKey, isBoard }) {
  $button("mainBtn").onclick = onMain;
  $button("undoBtn").onclick = onUndo;

  // Élément qui a reçu le focus par Tab, et non par un toucher (:focus-visible ne les distingue pas : toute touche
  // pressée le rend vrai)
  let tabbing = false;
  /** @type {EventTarget | null} */
  let tabFocused = null;
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Tab") tabbing = true;
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    () => {
      tabbing = false;
    },
    true,
  );
  document.addEventListener("focusin", (e) => {
    tabFocused = tabbing ? e.target : null;
  });

  document.addEventListener("keydown", (e) => {
    if (
      document.querySelector("dialog[open]") ||
      /INPUT|SELECT|TEXTAREA/.test(
        /** @type {HTMLElement} */ (e.target).tagName,
      )
    )
      return;
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    // bouton atteint au clavier (Tab) : Entrée et Espace l'activent, comme partout (#38). Un bouton touché
    // garde aussi le focus, mais la télécommande y reste le bouton principal
    if ((e.key === " " || e.key === "Enter") && e.target === tabFocused) return;
    if (NEXT_KEYS.includes(e.key)) {
      e.preventDefault();
      onMain();
      onKey(e.key);
    } else if (PREV_KEYS.includes(e.key)) {
      e.preventDefault();
      onUndo();
    }
  });
  // un bouton touché garde le focus : sans ça, Espace/Entrée le déclencherait une 2e fois
  document.addEventListener("click", (e) => {
    /** @type {HTMLElement} */ (e.target)
      .closest(".controls button")
      ?.closest("button")
      ?.blur();
  });

  // Mode tableau : un toucher sur le chrono affiche les boutons quelques secondes
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let controlsTimer;
  document.querySelector("main")?.addEventListener("click", () => {
    if (!isBoard()) return;
    document.body.dataset.controls = "shown";
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      delete document.body.dataset.controls;
    }, 8000);
  });
}
