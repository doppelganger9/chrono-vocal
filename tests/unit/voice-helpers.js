// Montage de js/voice.js pour les tests : le chrono est le vrai ; la voix, l'écran, le journal et les commandes
// annulables sont des espions.
import { setup } from "./helpers.js";
import { createVoice } from "../../js/voice.js";

export const T0 = Date.UTC(2026, 9, 18, 10);
export function voiceSetup(overrides = {}) {
  const h = setup({ rounds: 2, roundSec: 60, restSec: 60, ...overrides });
  const done = [],
    said = [],
    heard = [],
    journal = [],
    referee = [],
    rappels = [];
  let renders = 0,
    rappelOk = true;
  const command = (name, fn) => {
    const ok = fn() !== false;
    if (ok) done.push(name);
    return ok;
  };
  const voice = createVoice({
    getCfg: () => h.getCfg(),
    updateCfg: (c) => h.setCfg(c),
    chrono: h.chrono,
    command,
    commands: {
      STOP: () => command("STOP", h.chrono.stop),
      ALLEZ: () => command("ALLEZ", h.chrono.allez),
      REPOS: () => command("REPOS", h.chrono.endReprise),
    },
    endReprise: h.chrono.endReprise,
    rappel: (color) => {
      rappels.push(color);
      return rappelOk;
    },
    speech: { say: (text, opts) => said.push(opts ? [text, opts] : text) },
    ui: {
      showHeard: (t) => heard.push(t),
      phaseText: () => "PHASE",
      render: () => renders++,
    },
    onReferee: (p) => {
      referee.push(p);
      h.setCfg(p);
    },
    now: () => T0 + h.clock.t, // une heure réelle : « 0 ms depuis 0 » serait « juste avant »
    journal: { add: (e) => journal.push(e) },
  });
  let i = 0;
  return {
    h,
    voice,
    done,
    said,
    heard,
    journal,
    referee,
    rappels,
    get renders() {
      return renders;
    },
    set rappelOk(v) {
      rappelOk = v;
    },
    /** une phrase finie (index nouveau) */
    hear: (text, { final = true, alts = [] } = {}) =>
      voice.onResult([text, ...alts], final, i++),
    /** un résultat provisoire puis final pour le même index */
    hearSame: (texts, finals) => {
      const n = i++;
      texts.forEach((t, k) => voice.onResult([t], finals[k], n));
    },
    last: () => heard[heard.length - 1],
  };
}
