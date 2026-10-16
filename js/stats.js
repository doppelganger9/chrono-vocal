// Statistiques de l'assaut : arrêts, reprises, sanctions par tireur.
import { fmt, buildSentence } from './lang.js';

export const EVENT_LABELS = {
  observation: 'Observation', penalite: 'Pénalité', 'demande-avert': "Demande d'avertissement",
  avertissement: 'Avertissement', 'avert-refuse': 'Avertissement refusé', 'carton-jaune': 'Carton jaune',
  'carton-rouge': 'Carton rouge', disqualification: 'Disqualification', abandon: 'Abandon', forfait: 'Forfait',
};
export const eventLabel = e => EVENT_LABELS[e.type] + (e.detail ? ' (' + e.detail + ')' : '') + (e.color ? ' ' + e.color : '');
export const mmss = s => fmt(Math.round(s));
export const roundName = (n, b) => n > (b.cfg?.rounds ?? Infinity) ? 'S' + (n - b.cfg.rounds) : String(n);

/** @param now heure actuelle (ms), pour un arrêt ou une reprise en cours */
export function computeStats(b, now = Date.now()) {
  const stops = b.stops.map(x => ({ ...x, d: x.dur ?? (now - x.t0) / 1000 }));
  const total = stops.reduce((a, x) => a + x.d, 0);
  const rounds = Object.entries(b.rounds).map(([n, r]) => {
    const rs = stops.filter(x => x.round === +n);
    return { n: +n, stops: rs.length, stopped: rs.reduce((a, x) => a + x.d, 0), real: ((r.end || now) - r.start) / 1000, prolonged: r.prolonged, over: r.over || 0 };
  });
  const events = b.events || [];
  // sanctions par tireur ; les points vont à l'adversaire (pénalité 1, avertissement et carton 2)
  const colors = [...new Set([...(b.cfg?.colors || []), ...events.map(e => e.color)])].filter(Boolean);
  const byColor = [...colors, null].map(c => {
    const es = events.filter(e => (e.color || null) === c);
    const n = type => es.filter(e => e.type === type).length;
    return { color: c, observation: n('observation'), penalite: n('penalite'), avertissement: n('avertissement'),
      cartons: n('carton-jaune') + n('carton-rouge'), pts: es.reduce((a, e) => a + (e.pts || 0), 0), any: es.length };
  }).filter(r => r.color || r.any);
  return {
    n: stops.length, total, stops, rounds, events, byColor,
    avg: stops.length ? total / stops.length : 0,
    max: stops.reduce((a, x) => Math.max(a, x.d), 0),
    prolongations: rounds.filter(r => r.prolonged).length,
    bout: b.start ? ((b.end || now) - b.start) / 1000 : 0,
  };
}

/** Résumé texte, pour le partage */
export function statsText(b, k) {
  const d = new Date(b.start);
  const lines = [`Assaut du ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`];
  if (b.cfg) lines.push(buildSentence(b.cfg));
  lines.push(`Arrêts : ${k.n} — temps d'arrêt total ${mmss(k.total)} (moyen ${mmss(k.avg)}, plus long ${mmss(k.max)})`);
  if (k.prolongations) lines.push(`Prolongations de 30 s : ${k.prolongations}`);
  lines.push(`Durée réelle de l'assaut : ${mmss(k.bout)}`);
  for (const r of k.rounds) lines.push(`Reprise ${roundName(r.n, b)} : ${r.stops} arrêt(s), ${mmss(r.stopped)} d'arrêt, durée réelle ${mmss(r.real)}${r.over >= 1 ? `, temps dépassé ${mmss(r.over)}` : ''}`);
  k.stops.forEach((x, i) => {
    const motifs = k.events.filter(e => e.stop === i).map(eventLabel).join(', ');
    lines.push(`  #${i + 1} reprise ${roundName(x.round, b)} à ${mmss(x.at)} : ${mmss(x.d)}${motifs ? ' — ' + motifs : ''}`);
  });
  for (const c of k.byColor) if (c.any) lines.push(`Tireur ${c.color || '(couleur non précisée)'} : ${c.observation} observation(s), ${c.penalite} pénalité(s), ${c.avertissement} avertissement(s), ${c.cartons} carton(s) — ${c.pts} point(s) à l'adversaire`);
  return lines.join('\n');
}
