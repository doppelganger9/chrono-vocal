// Assemblage de l'app : crée le chrono, la voix et l'interface, et traduit les événements du chrono en effets.
import { fmt, durationFr, numFr, buildSentence } from './lang.js';
import { load, save, normalizeConfig } from './settings.js';
import { createChrono } from './chrono.js';
import { computeStats } from './stats.js';
import { createAnnex } from './annex.js';
import { createAudio } from './audio.js';
import { createSpeech } from './speech.js';
import { createVoice } from './voice.js';
import { render as renderScreen } from './ui/render.js';
import { createStatsDialog, LAST_BOUT_KEY } from './ui/stats-dialog.js';
import { createSettingsDialog } from './ui/settings-dialog.js';
import { createAnnexDialog } from './ui/annex-dialog.js';
import { $, $button } from './ui/dom.js';
import { applyTheme, watchSystemTheme } from './ui/theme.js';

const storage = (() => { try { return window.localStorage; } catch { return { getItem: () => null, setItem() {} }; } })();
const clock = { now: () => performance.now(), wall: () => Date.now() };
let cfg = load(storage);

const audio = createAudio();
const speech = createSpeech();
/** Débloque le son et la voix ; à appeler depuis un toucher (exigence d'iOS) */
const unlock = () => { speech.unlock(); audio.unlock(); };

/** @type {WakeLockSentinel | null} */
let wakeLock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.onrelease = () => wakeLock = null; } } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

/** @type {ReturnType<typeof setTimeout> | undefined} */
let heardTimer;
/** @param {string} t */
function showHeard(t) { $('heard').textContent = t; clearTimeout(heardTimer); heardTimer = setTimeout(() => $('heard').textContent = '', 5000); }

// ---------- Événements du chrono → sons, voix, affichage ----------
// Fin de reprise ou de repos : gong, puis « Temps » pendant qu'il résonne
const temps = () => { audio.gong(); setTimeout(() => speech.say('Temps'), 600); };
/** @type {Record<string, (data: any) => void>} */
const effects = {
  allez: () => { audio.beep(1200, 0.2); keepAwake(); },
  stop: () => audio.beep(400, 0.3),
  'reprise-end': () => { audio.beep(700, 0.15); keepAwake(); },
  temps,
  'time-up': () => {
    if (cfg.autoRest) setTimeout(() => { if (chrono.state.phase === 'overtime') command('Fin de reprise', chrono.endReprise); }, 4000);
  },
  'overtime-call': ({ over }) => { audio.beep(660, 0.25); speech.say('Temps'); showHeard('🔊 Temps (+' + fmt(Math.floor(over)) + ')'); },
  'rest-call': ({ sec }) => {
    speech.say(durationFr(sec));
    for (let i = 0; i < (sec <= 5 ? 3 : 2); i++) audio.beep(1000, 0.08, i * 0.15, 0.4); // bip de secours si la voix ne sort pas
    showHeard('🔊 ' + durationFr(sec));
  },
  relay: () => { audio.beep(1000, 0.1); audio.beep(1000, 0.1, 0.18); speech.say('Relais'); showHeard('🔁 Relais'); },
  'prolongation-offer': () => showHeard('⏱ Arrêt de plus de 30 s : prolonger la reprise ?'),
  prolongation: () => { speech.say('Prolongation de trente secondes'); showHeard('⏱ Prolongation +30 s'); },
  finish: () => {
    const bout = chrono.bout;
    try { storage.setItem(LAST_BOUT_KEY, JSON.stringify(bout)); } catch {}
    const k = computeStats(bout);
    setTimeout(() => chrono.state.phase === 'done' && speech.say("Fin de l'assaut. " + (k.n === 0 ? 'Aucun arrêt.'
      : k.n + (k.n > 1 ? ' arrêts, ' : ' arrêt, ') + durationFr(Math.round(k.total)) + " d'arrêt au total.")), 1200);
    setTimeout(() => { if (chrono.state.phase === 'done') stats.show(); }, 1500);
  },
  extra: () => { stats.close(); speech.say('Reprise supplémentaire'); keepAwake(); },
  change: () => render(),
};
const chrono = createChrono({ getCfg: () => cfg, clock, emit: (type, data) => effects[type]?.(data) });

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
  if (changed) { undoStack.push(snap); if (undoStack.length > 20) undoStack.shift(); render(); }
  return changed;
}
function undo() {
  const snap = undoStack.pop();
  if (!snap) return;
  chrono.restore(snap);
  speech.cancel();
  audio.beep(300, 0.12); audio.beep(300, 0.12, 0.18);
  showHeard('↶ ' + snap.name + ' annulé');
  render();
}
const cmdAllez = () => command('ALLEZ', chrono.allez);
const cmdStop = () => command('STOP', chrono.stop);
const cmdRepos = () => command('REPOS', chrono.endReprise);

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
const voice = createVoice({
  getCfg: () => cfg, updateCfg: applyConfig, chrono, command,
  commands: { STOP: cmdStop, ALLEZ: cmdAllez, REPOS: cmdRepos }, endReprise: chrono.endReprise,
  speech, ui: { showHeard, phaseText: () => $('phaseLabel').textContent, render },
  onReferee(p) {
    applyConfig({ ...p, mode: 'assaut', preset: 'custom' });
    if (chrono.state.phase !== 'ready' || chrono.state.round !== 1) { chrono.reset(); undoStack.length = 0; }
  },
});
createSettingsDialog({ getCfg: () => cfg, onSave: applyConfig, voice });

const annex = createAnnex({
  clock,
  emit: (_type, { minute: m }) => {
    audio.beep(900, 0.15); audio.beep(900, 0.15, 0.25);
    speech.say(m === 3 ? 'Trois minutes. Disqualification' : `${numFr(m)} minute${m > 1 ? 's' : ''}. Pénalité`);
  },
});
const annexDialog = createAnnexDialog({ annex, onStart: () => { unlock(); keepAwake(); } });

function render() {
  renderScreen({ chrono, cfg, lastEnGarde: voice.lastEnGarde, undoTop: undoStack[undoStack.length - 1] });
}

function mainAction() {
  unlock();
  const st = chrono.state;
  if (st.phase === 'ready' || st.halt) cmdAllez();
  else if (chrono.inPlay() || st.phase === 'rest') cmdStop();
  else if (st.phase === 'done') command('REPRISE SUPPL.', chrono.extraRound);
}
$button('mainBtn').onclick = mainAction;
$button('undoBtn').onclick = undo;

// Télécommande Bluetooth (télécommande de présentation, tourne-page) ou clavier :
// touche « suivant » = bouton principal, touche « précédent » = annuler
const NEXT_KEYS = [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown', 'MediaPlayPause', 'MediaTrackNext'];
const PREV_KEYS = ['PageUp', 'ArrowLeft', 'ArrowUp', 'Backspace', 'MediaTrackPrevious'];
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(/** @type {HTMLElement} */ (e.target).tagName)) return;
  if (e.repeat) { e.preventDefault(); return; }
  if (NEXT_KEYS.includes(e.key)) { e.preventDefault(); mainAction(); showHeard('⌨︎ ' + e.key); }
  else if (PREV_KEYS.includes(e.key)) { e.preventDefault(); undo(); }
});
// un bouton touché garde le focus : sans ça, Espace/Entrée le déclencherait une 2e fois
document.addEventListener('click', e => { /** @type {HTMLElement} */ (e.target).closest('.controls button')?.closest('button')?.blur(); });
// confirmation en deux appuis (confirm() est bloqué sur beaucoup de navigateurs mobiles)
/** @type {ReturnType<typeof setTimeout> | null} */
let resetArmed = null;
$('resetBtn').onclick = () => {
  const b = $('resetBtn');
  const nothingToLose = chrono.state.phase === 'ready' && chrono.state.round === 1;
  if (resetArmed || nothingToLose) {
    if (resetArmed) clearTimeout(resetArmed); resetArmed = null; b.classList.remove('confirm'); b.textContent = 'Réinitialiser';
    chrono.reset(); undoStack.length = 0; render(); return;
  }
  b.classList.add('confirm'); b.textContent = 'Confirmer ?';
  resetArmed = setTimeout(() => { resetArmed = null; b.classList.remove('confirm'); b.textContent = 'Réinitialiser'; }, 3000);
};
$button('prolongBtn').onclick = () => command('PROLONGATION', chrono.prolong);
$button('skipBtn').onclick = () => {
  if (chrono.inPlay()) command('Fin de reprise', chrono.endReprise);
  else if (chrono.state.phase === 'rest') command('Fin du repos', chrono.endRest);
};
$('announceBtn').onclick = () => { unlock(); speech.say(buildSentence(cfg)); showHeard('📣 ' + buildSentence(cfg)); };

// ---------- Micro ----------
function updateMic() {
  $('micBtn').classList.toggle('on', speech.listening);
  $('micText').textContent = speech.listening ? 'À l\'écoute' : 'Micro coupé';
}
$('micBtn').onclick = () => {
  unlock();
  if (speech.listening) { speech.stopListening(); updateMic(); return; }
  if (!speech.canListen) { alert("La reconnaissance vocale n'est pas disponible sur ce navigateur. Utilisez Chrome sur Android ou Safari sur iPhone."); return; }
  speech.listen({
    onResult: voice.onResult,
    onRestart: voice.onRestart,
    onDenied: () => { updateMic(); alert('Accès au micro refusé.'); },
  });
  updateMic(); keepAwake();
};

// ---------- Boucles ----------
// Le temps avance avec setInterval : requestAnimationFrame s'arrête dès que la page n'est plus affichée
setInterval(() => chrono.tick(), 100);
setInterval(() => { annex.tick(); if (annex.running) annexDialog.render(); }, 250);
let lastSlowRender = 0;
(function loop(t) {
  const st = chrono.state;
  if (st.running) render();
  else if (t - lastSlowRender > 250 && (st.halt || st.phase === 'ready' || st.prolongOffer)) { lastSlowRender = t; render(); } // compteur d'arrêt, « en garde »
  requestAnimationFrame(loop);
})(0);

applyTheme(cfg);
watchSystemTheme(() => applyTheme(cfg));
render();
