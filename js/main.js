// Assemblage de l'app : crée le chrono, la voix et l'interface, et traduit les événements du chrono en effets.
import { fmt, durationFr, buildSentence } from "./lang.js";
import { load, save, normalizeConfig } from "./settings.js";
import { createChrono } from "./chrono.js";
import { computeStats, rappelLabel, eventLabel } from "./stats.js";
import { createAnnex, annexAnnouncement } from "./annex.js";
import { createAudio } from "./audio.js";
import { createSpeech } from "./speech.js";
import { createVoice } from "./voice.js";
import { render as renderScreen } from "./ui/render.js";
import { createStatsDialog, LAST_BOUT_KEY } from "./ui/stats-dialog.js";
import { createSettingsDialog } from "./ui/settings-dialog.js";
import { createAnnexDialog } from "./ui/annex-dialog.js";
import { $, $button } from "./ui/dom.js";
import { applyTheme, watchSystemTheme } from "./ui/theme.js";
import { createIntro } from "./ui/intro-dialog.js";
import { createShare } from "./ui/share-dialog.js";
import { createJournal } from "./journal.js";
import { createJournalPanel } from "./ui/journal-panel.js";
import { createControls } from "./ui/controls.js";
import { twoTap } from "./ui/two-tap.js";
import { createMicWatch } from "./mic-watch.js";
import { createMicIndicator } from "./ui/mic-indicator.js";
import { VERSION } from "./version.js";

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem() {} };
  }
})();
const clock = { now: () => performance.now(), wall: () => Date.now() };
let cfg = load(storage);

const audio = createAudio();
const speech = createSpeech();
/** Débloque le son et la voix ; à appeler depuis un toucher (exigence d'iOS) */
const unlock = () => {
  speech.unlock();
  audio.unlock();
};

/** @type {WakeLockSentinel | null} */
let wakeLock = null;
async function keepAwake() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.onrelease = () => (wakeLock = null);
    }
  } catch {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") keepAwake();
});

/** @type {ReturnType<typeof setTimeout> | undefined} */
let heardTimer;
/** @param {string} t */
function showHeard(t) {
  $("heard").textContent = t;
  clearTimeout(heardTimer);
  heardTimer = setTimeout(() => ($("heard").textContent = ""), 5000);
}

// ---------- Événements du chrono → sons, voix, affichage ----------
// Fin de reprise ou de repos : gong, puis « Temps » pendant qu'il résonne
const temps = () => {
  audio.gong();
  setTimeout(() => speech.say("Temps"), 600);
};
/** @type {Record<string, (data: any) => void>} */
const effects = {
  allez: () => {
    audio.beep(1200, 0.2);
    keepAwake();
  },
  stop: () => audio.beep(400, 0.3),
  "reprise-end": () => {
    audio.beep(700, 0.15);
    keepAwake();
  },
  temps,
  "time-up": () => {
    if (cfg.autoRest)
      setTimeout(() => {
        if (chrono.state.phase === "overtime")
          command("Fin de reprise", chrono.endReprise);
      }, 4000);
  },
  "overtime-call": ({ over }) => {
    audio.beep(660, 0.25);
    speech.say("Temps");
    showHeard("🔊 Temps (+" + fmt(Math.floor(over)) + ")");
  },
  "rest-call": ({ sec }) => {
    speech.say(durationFr(sec));
    for (let i = 0; i < (sec <= 5 ? 3 : 2); i++)
      audio.beep(1000, 0.08, i * 0.15, 0.4); // bip de secours si la voix ne sort pas
    showHeard("🔊 " + durationFr(sec));
  },
  relay: () => {
    audio.beep(1000, 0.1);
    audio.beep(1000, 0.1, 0.18);
    speech.say("Relais");
    showHeard("🔁 Relais");
  },
  "prolongation-offer": () =>
    showHeard("⏱ Arrêt de plus de 30 s : prolonger la reprise ?"),
  prolongation: () => {
    speech.say("Prolongation de trente secondes");
    showHeard("⏱ Prolongation +30 s");
  },
  finish: () => {
    const bout = chrono.bout;
    try {
      storage.setItem(LAST_BOUT_KEY, JSON.stringify(bout));
    } catch {}
    const k = computeStats(bout);
    setTimeout(
      () =>
        chrono.state.phase === "done" &&
        speech.say(
          "Fin de l'assaut. " +
            (k.n === 0
              ? "Aucun arrêt."
              : k.n +
                (k.n > 1 ? " arrêts, " : " arrêt, ") +
                durationFr(Math.round(k.total)) +
                " d'arrêt au total."),
        ),
      1200,
    );
    setTimeout(() => {
      if (chrono.state.phase === "done") stats.show();
    }, 1500);
  },
  extra: () => {
    stats.close();
    speech.say("Reprise supplémentaire");
    keepAwake();
  },
  change: () => render(),
};
const chrono = createChrono({
  getCfg: () => cfg,
  clock,
  emit: (type, data) => effects[type]?.(data),
});

// ---------- Annulation ----------
// Chaque commande (voix, bouton, télécommande) mémorise l'état d'avant. « Annuler » y revient,
// comme si la commande n'avait jamais eu lieu : un STOP parasite annulé laisse le chrono avoir tourné
// pendant ce temps, un ALLEZ parasite annulé prolonge l'arrêt en cours.
/** @type {{ name: string, st: import('./types.js').ChronoState, bout: import('./types.js').Bout }[]} */
const undoStack = [];
/** Exécute une action annulable @param {string} name @param {() => unknown} fn @returns {boolean} true si elle a eu un effet */
function command(name, fn) {
  const snap = { name, ...chrono.snapshot() };
  const changed = fn() !== false;
  if (changed) {
    undoStack.push(snap);
    if (undoStack.length > 20) undoStack.shift();
    render();
  }
  return changed;
}
function undo() {
  const snap = undoStack.pop();
  if (!snap) return;
  chrono.restore(snap);
  speech.cancel();
  audio.beep(300, 0.12);
  audio.beep(300, 0.12, 0.18);
  showHeard("↶ " + snap.name + " annulé");
  render();
}
const cmdAllez = () => command("ALLEZ", chrono.allez);
const cmdStop = () => command("STOP", chrono.stop);
const cmdRepos = () => command("REPOS", chrono.endReprise);

/** @param {Partial<import('./types.js').Config>} c */
function applyConfig(c) {
  cfg = normalizeConfig({ ...cfg, ...c });
  save(storage, cfg);
  applyTheme(cfg);
  chrono.configChanged();
  render();
}

// ---------- Interface ----------
const stats = createStatsDialog({ getBout: () => chrono.bout, storage });
const journal = createJournal({ storage });
const voice = createVoice({
  getCfg: () => cfg,
  updateCfg: applyConfig,
  chrono,
  command,
  journal,
  commands: { STOP: cmdStop, ALLEZ: cmdAllez, REPOS: cmdRepos },
  endReprise: chrono.endReprise,
  rappel,
  speech,
  ui: { showHeard, phaseText: () => $("phaseLabel").textContent, render },
  onReferee(p) {
    applyConfig({ ...p, mode: "assaut", preset: "custom" });
    if (chrono.state.phase !== "ready" || chrono.state.round !== 1) {
      chrono.reset();
      undoStack.length = 0;
    }
  },
});
createSettingsDialog({ getCfg: () => cfg, onSave: applyConfig, voice });

createJournalPanel({ journal });

const annex = createAnnex({
  clock,
  emit: (_type, { minute, mode, color }) => {
    audio.beep(900, 0.15);
    audio.beep(900, 0.15, 0.25);
    const text = annexAnnouncement(mode, minute);
    speech.say(text);
    // second exclu (#9) : le carton rouge est noté dans l'assaut commencé, et annulable
    if (mode === "second" && chrono.bout.start) {
      const ev = {
        type: /** @type {const} */ ("carton-rouge"),
        pts: 2,
        detail: "second exclu",
        color,
      };
      let label = "";
      command("CARTON ROUGE", () => {
        label = eventLabel(chrono.addEvent(ev));
      });
      showHeard("📝 " + label);
    } else showHeard("🔊 " + text);
  },
});
const annexDialog = createAnnexDialog({
  annex,
  getColors: () => cfg.colors,
  onStart: () => {
    unlock();
    keepAwake();
  },
});

function render() {
  renderScreen({
    chrono,
    cfg,
    lastEnGarde: voice.lastEnGarde,
    undoTop: undoStack[undoStack.length - 1],
  });
}

function mainAction() {
  unlock();
  const st = chrono.state;
  if (st.phase === "ready" || st.halt) cmdAllez();
  else if (chrono.inPlay() || st.phase === "rest") cmdStop();
  else if (st.phase === "done") command("REPRISE SUPPL.", chrono.extraRound);
}
createControls({
  onMain: mainAction,
  onUndo: undo,
  onKey: (key) => showHeard("⌨︎ " + key),
  isBoard: () => cfg.board,
});
// réinitialiser : en deux appuis, sauf s'il n'y a rien à perdre (avant la 1re reprise)
twoTap($("resetBtn"), {
  label: "Réinitialiser",
  armedClass: "confirm",
  skip: () => chrono.state.phase === "ready" && chrono.state.round === 1,
  onConfirm: () => {
    chrono.reset();
    undoStack.length = 0;
    render();
  },
});
// Rappel d'un tireur à l'appel de la reprise (C15) : la sanction suit le rang du rappel. false si hors repos et « prêt »
/** @param {string} color */
function rappel(color) {
  /** @type {import('./types.js').SanctionEvent | null} */
  let ev = null;
  command("RAPPEL " + color.toUpperCase(), () => !!(ev = chrono.rappel(color)));
  if (ev) showHeard("📝 " + rappelLabel(ev));
  return !!ev;
}
$("rappels").onclick = (e) => {
  const color = /** @type {HTMLElement} */ (e.target).closest("button")?.dataset
    .color;
  if (color) rappel(color);
};
$button("prolongBtn").onclick = () => command("PROLONGATION", chrono.prolong);
$button("skipBtn").onclick = () => {
  if (chrono.inPlay()) command("Fin de reprise", chrono.endReprise);
  else if (chrono.state.phase === "rest")
    command("Fin du repos", chrono.endRest);
};
$("announceBtn").onclick = () => {
  unlock();
  speech.say(buildSentence(cfg));
  showHeard("📣 " + buildSentence(cfg));
};

// ---------- Micro ----------
// Témoin « micro silencieux » (#56) : 30 s sans aucun signe de vie de la reconnaissance. window.__chronoEnv.micSilentMs
// le règle (0 le coupe : la fausse reconnaissance des tests ne transmet rien d'elle-même)
const silentMs = /** @type {{ __chronoEnv?: { micSilentMs?: number } }} */ (
  /** @type {unknown} */ (window)
).__chronoEnv?.micSilentMs;
const micWatch = createMicWatch({
  now: () => Date.now(),
  thresholdMs:
    silentMs === undefined ? 30_000 : silentMs > 0 ? silentMs : Infinity,
});
const micIndicator = createMicIndicator({
  watch: micWatch,
  speech,
  onSilence: (ms) =>
    journal.event("silence", String(Math.round(ms / 1000)), chrono.state.phase),
  onRelaunch: () => {
    unlock();
    speech.relaunch();
    micIndicator.update();
  },
});
/** @param {string} event @param {string} [detail] */
function onMicEvent(event, detail) {
  micWatch.activity();
  if (event !== "result") journal.event(event, detail, chrono.state.phase); // les résultats sont notés en phrases
  micIndicator.update();
}
setInterval(micIndicator.update, 1000);
function updateMic() {
  $("micBtn").classList.toggle("on", speech.listening);
  $("micText").textContent = speech.listening ? "À l'écoute" : "Micro coupé";
}
function startMic() {
  if (!speech.canListen) {
    alert(
      "La reconnaissance vocale n'est pas disponible sur ce navigateur. Utilisez Chrome sur Android ou Safari sur iPhone.",
    );
    return;
  }
  speech.listen({
    onResult: voice.onResult,
    onRestart: voice.onRestart,
    onDenied: () => {
      updateMic();
      alert("Accès au micro refusé.");
    },
    onEvent: onMicEvent,
  });
  updateMic();
  keepAwake();
}
$("micBtn").onclick = () => {
  unlock();
  if (micIndicator.silent) {
    speech.relaunch();
    micIndicator.update();
    return;
  } // micro figé : relancer, pas couper
  if (speech.listening) {
    speech.stopListening();
    updateMic();
    micIndicator.update();
    return;
  }
  startMic();
};
// Hors ligne (#40) : le service worker garde l'app en cache. Une nouvelle version est prise au prochain lancement.
// Safari sur iPhone garde l'onglet ouvert : la version en attente est donc prise à l'ouverture de la page, quand rien
// n'est en cours, puis la page se recharge (#84). Jamais plus tard : pas au milieu d'un assaut
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      if (!reg.waiting || !navigator.serviceWorker.controller) return;
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => location.reload(),
        { once: true },
      );
      reg.waiting.postMessage("activer");
    })
    .catch(() => {});
// Version (#39) : sur l'écran titre, ouvert aussi depuis « À propos » dans les réglages (#84)
$("introAgain").textContent = "À propos · version " + VERSION;
$("introVersion").textContent = "Version " + VERSION;
// Écran titre : au premier lancement, puis une fois par nouvelle version, avec ses notes (#6, #84)
createIntro({
  storage,
  onStart: () => {
    unlock();
    startMic();
  },
});
// Réglages partagés par lien ou fichier (#15) : après l'écran titre, pour s'afficher par-dessus
createShare({
  getCfg: () => cfg,
  onApply: (c) => {
    applyConfig(c);
    showHeard("✅ Réglages importés");
  },
});

// ---------- Boucles ----------
// Le temps avance avec setInterval : requestAnimationFrame s'arrête dès que la page n'est plus affichée
setInterval(() => chrono.tick(), 100);
setInterval(() => {
  annex.tick();
  if (annex.running) annexDialog.render();
}, 250);
let lastSlowRender = 0;
(function loop(t) {
  const st = chrono.state;
  if (st.running) render();
  else if (
    t - lastSlowRender > 250 &&
    (st.halt || st.phase === "ready" || st.prolongOffer)
  ) {
    lastSlowRender = t;
    render();
  } // compteur d'arrêt, « en garde »
  requestAnimationFrame(loop);
})(0);

applyTheme(cfg);
watchSystemTheme(() => applyTheme(cfg));
render();
