// Mise à jour disponible (#96) : une nouvelle version, téléchargée par le service worker pendant la visite, attend
// son activation. Elle est proposée à l'arbitre, qui décide (ADR 0006), et seulement quand rien n'est en cours :
// jamais au milieu d'un assaut (décision de David, 19 octobre 2026, sw.js).

/**
 * Ce que l'app lit de l'enregistrement du service worker
 * @typedef {EventTarget & { readonly waiting: unknown, readonly installing: (EventTarget & { readonly state: string }) | null }} UpdateRegistration
 */

/** Rien n'est en cours : avant la première reprise, ou l'assaut terminé @param {Pick<import('./types.js').ChronoState, 'phase' | 'round' | 'running'>} st */
export const canUpdate = (st) =>
  (st.phase === "ready" && st.round === 1 && !st.running) ||
  st.phase === "done";

/**
 * Prévient, une fois, qu'une nouvelle version attend son activation
 * @param {UpdateRegistration} reg
 * @param {boolean} controlled la page est déjà servie par un service worker (sinon, c'est la première installation)
 * @param {() => void} onReady
 */
export function watchUpdate(reg, controlled, onReady) {
  if (!controlled) return;
  if (reg.waiting) {
    onReady();
    return;
  }
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    if (!w) return;
    const installed = () => {
      if (w.state !== "installed") return;
      w.removeEventListener("statechange", installed);
      onReady();
    };
    w.addEventListener("statechange", installed);
  });
}
