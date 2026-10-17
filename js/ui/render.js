// Affichage de l'écran principal à partir de l'état du chrono.
import { $, $button } from './dom.js';
import { fmt } from '../lang.js';

/** @type {Record<import('../types.js').Phase, string>} */
const LABELS = { ready: 'Prêt — en garde', round: 'Assaut', overtime: 'Temps dépassé', rest: 'Minute de repos', done: "Fin de l'assaut" };

/**
 * @param {object} p
 * @param {ReturnType<typeof import('../chrono.js').createChrono>} p.chrono
 * @param {import('../types.js').Config} p.cfg
 * @param {number} p.lastEnGarde  heure du dernier « en garde »
 * @param {{ name: string } | undefined} p.undoTop  dernière commande annulable
 * @param {number} [p.now]
 * @param {HTMLElement} [p.body]
 */
export function render({ chrono, cfg, lastEnGarde, undoTop, now = Date.now(), body = document.body }) {
  const st = chrono.state, bout = chrono.bout, inPlay = chrono.inPlay(), max = chrono.curMax();
  $('roundLabel').textContent = cfg.mode === 'relais'
    ? (chrono.isExtra() ? 'Relais — reprise supplémentaire' : 'Relais — reprise unique')
    : chrono.isExtra() ? `Reprise supplémentaire ${st.round - cfg.rounds}` : `Reprise ${st.round} / ${cfg.rounds}`;
  const time = st.phase === 'overtime' ? '+' + fmt(Math.floor(chrono.overtime())) : fmt(st.remaining);
  $('time').textContent = time;
  $('time').style.setProperty('--chars', String(time.length)); // taille des chiffres selon leur nombre (css/app.css)
  $('max').textContent = '/ ' + fmt(max);
  const rs = bout.stops.filter(x => x.round === st.round);
  const open = st.halt && inPlay ? rs[rs.length - 1] : null;
  let line = '';
  if (open) line = `Arrêt ${rs.length} · ${fmt(Math.floor((now - open.t0) / 1000))}` + (cfg.countStops ? '' : ' (non décompté)');
  else if (st.phase === 'round' && st.relayUntil && chrono.elapsed() < st.relayUntil) line = `🔁 Relais · ${fmt(st.relayUntil - chrono.elapsed())}`;
  else if (inPlay && rs.length) {
    const tot = rs.reduce((a, x) => a + (x.dur ?? 0), 0);
    line = `${rs.length} arrêt${rs.length > 1 ? 's' : ''} · ${fmt(tot)}`;
  }
  if (st.prolonged && inPlay) line += (line ? ' · ' : '') + 'prolongation +30 s';
  $('stops').textContent = line;
  $button('prolongBtn').hidden = !(st.prolongOffer > now && !st.prolonged && inPlay);
  $('barFill').style.width = (st.phase === 'done' || st.phase === 'overtime' ? 100 : 100 * (1 - st.remaining / max)) + '%';
  const paused = st.halt;
  body.className = (/** @type {Partial<Record<string, string>>} */ ({ rest: 'rest', round: 'round', overtime: 'over' })[st.phase] || st.phase) + (paused ? ' paused' : '');
  let label = paused ? (st.phase === 'rest' ? 'Repos arrêté' : 'Arrêt') : LABELS[st.phase];
  if (st.phase === 'ready' && now - lastEnGarde < 10000) label = 'En garde';
  $('phaseLabel').textContent = label;

  const b = $button('mainBtn'); b.disabled = false; b.className = '';
  if (st.phase === 'ready' || paused) b.textContent = 'ALLEZ';
  else if (inPlay || st.phase === 'rest') { b.textContent = 'STOP'; b.className = 'stop'; }
  else if (st.extra < cfg.extraMax) b.textContent = 'REPRISE SUPPL.';
  else { b.textContent = 'Terminé'; b.disabled = true; }
  $button('skipBtn').textContent = st.phase === 'rest' ? 'Fin du repos' : st.round >= chrono.totalRounds() ? "Fin de l'assaut" : 'Fin de la reprise';
  $button('skipBtn').disabled = !(inPlay || st.phase === 'rest');
  $button('undoBtn').disabled = !undoTop;
  $button('undoBtn').textContent = undoTop ? '↶ Annuler ' + undoTop.name : '↶ Annuler';
}
