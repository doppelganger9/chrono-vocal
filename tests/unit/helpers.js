// Banc d'essai du chrono : horloge simulée, réglages modifiables, événements enregistrés.
import { createChrono } from "../../js/chrono.js";
import { DEFAULTS, normalizeConfig } from "../../js/settings.js";

export function setup(overrides = {}) {
  let cfg = normalizeConfig({ ...DEFAULTS, ...overrides });
  const clock = {
    t: 0,
    start: Date.UTC(2026, 9, 17, 10),
    now() {
      return this.t;
    },
    wall() {
      return this.start + this.t;
    },
  };
  const events = [];
  let changes = 0; // « change » ne fait que demander de redessiner l'écran : compté à part
  const emit = (type, data = {}) =>
    type === "change" ? changes++ : events.push({ type, ...data });
  const chrono = createChrono({ getCfg: () => cfg, clock, emit });
  return {
    chrono,
    clock,
    events,
    getCfg: () => cfg,
    get changes() {
      return changes;
    },
    get st() {
      return chrono.state;
    },
    get bout() {
      return chrono.bout;
    },
    /** avance l'horloge par pas de 100 ms, comme la boucle de l'app */
    advance(ms) {
      for (let left = ms; left > 0; left -= 100) {
        clock.t += Math.min(100, left);
        chrono.tick();
      }
    },
    setCfg(o) {
      cfg = normalizeConfig({ ...cfg, ...o });
      chrono.configChanged();
    },
    types: () => events.map((e) => e.type),
    clear() {
      events.length = 0;
    },
  };
}
