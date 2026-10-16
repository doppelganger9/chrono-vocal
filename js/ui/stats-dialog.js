// Fenêtre des statistiques : assaut en cours, ou dernier assaut enregistré sur le téléphone.
import { computeStats, statsText, eventLabel, roundName, mmss } from '../stats.js';

export const LAST_BOUT_KEY = 'chrono-canne-last';

export function createStatsDialog({ $, getBout, storage }) {
  let shown = null;
  function show() {
    let b = getBout(), title = 'Assaut en cours';
    if (!b.start) {
      try { b = JSON.parse(storage.getItem(LAST_BOUT_KEY) || 'null'); } catch { b = null; }
      title = 'Dernier assaut';
    } else if (b.end) title = "Fin de l'assaut";
    shown = b;
    $('statsTitle').textContent = title;
    if (!b || !b.start) {
      $('statsBody').innerHTML = '<p class="empty">Aucun assaut enregistré pour l\'instant.</p>';
      $('shareStats').hidden = true;
    } else {
      const k = computeStats(b);
      $('shareStats').hidden = false;
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
          ${k.stops.map((x, i) => `<tr><td>${i + 1}</td><td>${roundName(x.round, b)}</td><td>${mmss(x.at)}</td><td>${mmss(x.d)}${x.dur === null ? ' ⏸' : ''}</td><td>${k.events.filter(e => e.stop === i).map(eventLabel).join(', ') || '—'}</td></tr>`).join('')}
        </table>` : '<p class="empty">Aucun arrêt.</p>'}
        ${k.events.length ? `<h3>Sanctions par tireur</h3>
        <table><tr><th>Tireur</th><th>Obs.</th><th>Pén.</th><th>Avert.</th><th>Cartons</th><th>Pts adv.</th></tr>
          ${k.byColor.map(c => `<tr><td>${c.color || '?'}</td><td>${c.observation}</td><td>${c.penalite}</td><td>${c.avertissement}</td><td>${c.cartons}</td><td>${c.pts}</td></tr>`).join('')}
        </table>` : ''}`;
    }
    if (!$('statsDlg').open) $('statsDlg').showModal();
  }
  $('statsBtn').onclick = show;
  $('closeStats').onclick = () => $('statsDlg').close();
  $('shareStats').onclick = async () => {
    const text = statsText(shown, computeStats(shown));
    try {
      if (navigator.share) await navigator.share({ title: 'Chrono Canne', text });
      else { await navigator.clipboard.writeText(text); $('shareStats').textContent = 'Copié ✓'; setTimeout(() => $('shareStats').textContent = 'Partager', 2000); }
    } catch {}
  };
  return { show, close() { if ($('statsDlg').open) $('statsDlg').close(); } };
}
