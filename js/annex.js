// Chronomètre annexe (C14) : retard (I 4.2.13), une pénalité par minute, disqualification à 3 minutes ;
// second exclu qui refuse de sortir (I 4.2.5.4), carton rouge au tireur au bout d'une minute.
import { numFr } from "./lang.js";

/** @typedef {'retard' | 'second'} AnnexMode */

/** Durée au bout de laquelle la sanction finale tombe (secondes) @param {AnnexMode} mode */
export const annexLimit = (mode) => (mode === "second" ? 60 : 180);

/** Ce que dit le chrono à la minute donnée @param {AnnexMode} mode @param {number} minute */
export function annexAnnouncement(mode, minute) {
  if (mode === "second") return "Une minute. Carton rouge";
  return minute === 3
    ? "Trois minutes. Disqualification"
    : `${numFr(minute)} minute${minute > 1 ? "s" : ""}. Pénalité`;
}

/**
 * @param {object} deps
 * @param {Pick<import('./types.js').Clock, 'wall'>} deps.clock
 * @param {import('./types.js').Emit} deps.emit  'annex-minute' { minute, mode, color } à chaque minute jusqu'à la limite du mode
 */
export function createAnnex({ clock, emit }) {
  let running = false,
    t0 = 0,
    acc = 0,
    called = new Set();
  /** @type {AnnexMode} */
  let mode = "retard";
  /** Tireur du second exclu, pour noter son carton (#9) @type {string | null} */
  let color = null;
  const elapsed = () => acc + (running ? (clock.wall() - t0) / 1000 : 0);
  const reset = () => {
    running = false;
    acc = 0;
    called = new Set();
  };
  return {
    get running() {
      return running;
    },
    get mode() {
      return mode;
    },
    get color() {
      return color;
    },
    elapsed,
    toggle() {
      if (running) {
        acc = elapsed();
        running = false;
      } else {
        t0 = clock.wall();
        running = true;
      }
    },
    reset,
    /** Change d'usage, et repart de zéro @param {AnnexMode} m */
    setMode(m) {
      mode = m;
      color = null;
      reset();
    },
    /** @param {string | null} c */
    setColor(c) {
      color = c;
    },
    tick() {
      if (!running) return;
      const e = elapsed();
      for (let m = 1; m <= annexLimit(mode) / 60; m++) {
        if (e >= m * 60 && !called.has(m)) {
          called.add(m);
          emit("annex-minute", { minute: m, mode, color });
        }
      }
    },
  };
}
