// Chronomètre annexe des retards (I 4.2.13) : une pénalité par minute, disqualification à 3 minutes.
/**
 * @param {object} deps
 * @param {Pick<import('./types.js').Clock, 'wall'>} deps.clock
 * @param {import('./types.js').Emit} deps.emit  'annex-minute' { minute } à 1, 2 et 3 minutes
 */
export function createAnnex({ clock, emit }) {
  let running = false,
    t0 = 0,
    acc = 0,
    called = new Set();
  const elapsed = () => acc + (running ? (clock.wall() - t0) / 1000 : 0);
  return {
    get running() {
      return running;
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
    reset() {
      running = false;
      acc = 0;
      called = new Set();
    },
    tick() {
      if (!running) return;
      const e = elapsed();
      for (let m = 1; m <= 3; m++) {
        if (e >= m * 60 && !called.has(m)) {
          called.add(m);
          emit("annex-minute", { minute: m });
        }
      }
    },
  };
}
