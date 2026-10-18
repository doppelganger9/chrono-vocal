// Fenêtre des statistiques : assaut en cours, ou dernier assaut enregistré sur le téléphone.
import { $, $button, $dialog } from './dom.js';
import { computeStats, statsText, eventLabel, rappelLabel, roundName, mmss } from '../stats.js';
import { tireurColor } from '../colors.js';
import { esc } from '../html.js';

/** Pastille de couleur devant le nom d'un tireur @param {string | null} name */
const dot = name => { const c = tireurColor(name); return c ? `<span class="tireur-dot" style="background:${c}"></span>` : ''; };

export const LAST_BOUT_KEY = 'chrono-canne-last';

/** @typedef {import('../types.js').Bout} Bout */

/** @param {{ getBout: () => Bout, storage: Pick<Storage, 'getItem'> }} deps */
export function createStatsDialog({ getBout, storage }) {
  /** @type {Bout | null} */
  let shown = null;
  function show() {
    /** @type {Bout | null} */
    let b = getBout();
    let title = 'Assaut en cours';
    if (!b.start) {
      try { b = JSON.parse(storage.getItem(LAST_BOUT_KEY) || 'null'); } catch { b = null; }
      title = 'Dernier assaut';
    } else if (b.end) title = "Fin de l'assaut";
    shown = b;
    $('statsTitle').textContent = title;
    if (!b || !b.start) {
      $('statsBody').innerHTML = '<p class="empty">Aucun assaut enregistré pour l\'instant.</p>';
      $button('shareStats').hidden = true;
    } else {
      const k = computeStats(b);
      $button('shareStats').hidden = false;
      $('statsBody').innerHTML = `
        <div class="tiles">
          <div class="tile"><b>${k.n}</b><span>arrêts</span></div>
          <div class="tile"><b>${mmss(k.total)}</b><span>temps d'arrêt total</span></div>
          <div class="tile"><b>${mmss(k.avg)}</b><span>arrêt moyen</span></div>
          <div class="tile"><b>${mmss(k.max)}</b><span>arrêt le plus long</span></div>
          <div class="tile" style="grid-column:1/-1"><b>${mmss(k.bout)}</b><span>durée réelle de l'assaut (arrêts et repos compris)${k.prolongations ? ` — ${k.prolongations} prolongation(s) de 30 s` : ''}</span></div>
        </div>
        <h3>Par reprise</h3>
        <table><tr><th>Reprise</th><th>Arrêts</th><th>Temps arrêté</th><th>Durée réelle</th></tr>
          ${k.rounds.map(r => `<tr><td>${roundName(r.n, b)}${r.prolonged ? ' +30 s' : ''}${r.over >= 1 ? ` <small>(dépassé +${mmss(r.over)})</small>` : ''}</td><td>${r.stops}</td><td>${mmss(r.stopped)}</td><td>${mmss(r.real)}</td></tr>`).join('')}
        </table>
        <h3>Détail des arrêts</h3>
        ${k.n ? `<table><tr><th>#</th><th>Reprise</th><th>Chrono à</th><th>Durée</th><th>Motif</th></tr>
          ${k.stops.map((x, i) => `<tr><td>${i + 1}</td><td>${roundName(x.round, b)}</td><td>${mmss(x.at)}</td><td>${mmss(x.d)}${x.dur === null ? ' ⏸' : ''}</td><td>${k.events.filter(e => e.stop === i).map(e => esc(eventLabel(e))).join(', ') || '—'}</td></tr>`).join('')}
        </table>` : '<p class="empty">Aucun arrêt.</p>'}
        ${k.events.length ? `<h3>Sanctions par tireur</h3>
        <table><tr><th>Tireur</th><th>Obs.</th><th>Pén.</th><th>Avert.</th><th>Cartons</th><th>Pts adv.</th></tr>
          ${k.byColor.map(c => `<tr><td>${dot(c.color)}${esc(c.color || '?')}</td><td>${c.observation}</td><td>${c.penalite}</td><td>${c.avertissement}</td><td>${c.cartons}</td><td>${c.pts}</td></tr>`).join('')}
        </table>` : ''}
        ${k.events.some(e => e.rappel) ? `<h3>Rappels à l'appel</h3><ul class="rappels">${k.events.filter(e => e.rappel).map(e => `<li>Reprise ${roundName(e.round, b)} : ${esc(rappelLabel(e).replace(' : ', ', '))}</li>`).join('')}</ul>` : ''}`;
    }
    if (!$dialog('statsDlg').open) $dialog('statsDlg').showModal();
  }
  $('statsBtn').onclick = show;
  $('closeStats').onclick = () => $dialog('statsDlg').close();
  $button('shareStats').onclick = async () => {
    if (!shown) return;
    const text = statsText(shown, computeStats(shown));
    try {
      if (navigator.share) await navigator.share({ title: 'Chrono Canne', text });
      else { await navigator.clipboard.writeText(text); $button('shareStats').textContent = 'Copié ✓'; setTimeout(() => $button('shareStats').textContent = 'Partager', 2000); }
    } catch {}
  };
  return { show, close() { if ($dialog('statsDlg').open) $dialog('statsDlg').close(); } };
}
