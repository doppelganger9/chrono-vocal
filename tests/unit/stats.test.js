// Statistiques de l'assaut (js/stats.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, statsText, eventLabel, roundName, mmss } from '../../js/stats.js';

const T = Date.UTC(2026, 9, 17, 10);
const s = sec => T + sec * 1000;
const bout = {
  start: s(0), end: s(300),
  cfg: { mode: 'assaut', rounds: 2, roundSec: 90, restSec: 60, colors: ['rouge', 'bleu'] },
  rounds: { 1: { start: s(0), end: s(110), prolonged: false, over: 0 }, 2: { start: s(170), end: s(275), prolonged: true, over: 4 }, 3: { start: s(280), end: null } },
  stops: [
    { round: 1, at: 10, t0: s(10), dur: 12 },
    { round: 1, at: 50, t0: s(60), dur: 8 },
    { round: 2, at: 20, t0: s(190), dur: 31, prolongation: true },
  ],
  events: [
    { type: 'penalite', detail: "sortie d'aire", color: 'bleu', pts: 1, round: 1, stop: 0 },
    { type: 'avertissement', color: 'rouge', pts: 2, round: 2, stop: 2 },
    { type: 'carton-jaune', color: 'bleu', pts: 2, round: 2, stop: 2 },
    { type: 'observation', color: null, pts: 0, round: 2, stop: null },
  ],
};

test('totaux, moyenne et plus long arrêt', () => {
  const k = computeStats(bout, s(300));
  assert.equal(k.n, 3);
  assert.equal(k.total, 51);
  assert.equal(k.avg, 17);
  assert.equal(k.max, 31);
  assert.equal(k.bout, 300);
  assert.equal(k.prolongations, 1);
});

test('par reprise : arrêts, temps arrêté, durée réelle (en cours si pas finie), dépassement', () => {
  const k = computeStats(bout, s(290));
  assert.deepEqual(k.rounds.map(r => [r.n, r.stops, r.stopped, r.real, r.over]), [[1, 2, 20, 110, 0], [2, 1, 31, 105, 4], [3, 0, 0, 10, 0]]);
});

test('arrêt en cours : sa durée court jusqu\'à maintenant', () => {
  const b = { ...bout, stops: [{ round: 1, at: 0, t0: s(100), dur: null }] };
  assert.equal(computeStats(b, s(107)).total, 7);
});

test('sanctions par tireur, points accordés à l\'adversaire', () => {
  const k = computeStats(bout, s(300));
  assert.deepEqual(k.byColor.map(c => [c.color, c.observation, c.penalite, c.avertissement, c.cartons, c.pts]),
    [['rouge', 0, 0, 1, 0, 2], ['bleu', 0, 1, 0, 1, 3], [null, 1, 0, 0, 0, 0]]);
});

test('assaut sans début : durée nulle', () => {
  assert.equal(computeStats({ ...bout, start: null }, s(10)).bout, 0);
});

test('libellés', () => {
  assert.equal(eventLabel(bout.events[0]), "Pénalité (sortie d'aire) bleu");
  assert.equal(eventLabel(bout.events[3]), 'Observation');
  assert.equal(roundName(3, bout), 'S1');
  assert.equal(roundName(2, bout), '2');
  assert.equal(roundName(5, { cfg: null }), '5');
  assert.equal(mmss(59.6), '1:00');
});

test('résumé texte à partager', () => {
  const text = statsText(bout, computeStats(bout, s(300)));
  assert.match(text, /^Assaut du 17\/10\/2026 à \d\d:\d\d$/m);
  assert.match(text, /Pour un assaut en deux reprises d'une minute trente, avec une minute de repos\./);
  assert.match(text, /Arrêts : 3 — temps d'arrêt total 0:51 \(moyen 0:17, plus long 0:31\)/);
  assert.match(text, /Prolongations de 30 s : 1/);
  assert.match(text, /Reprise 2 : 1 arrêt\(s\), 0:31 d'arrêt, durée réelle 1:45, temps dépassé 0:04/);
  assert.match(text, /#1 reprise 1 à 0:10 : 0:12 — Pénalité \(sortie d'aire\) bleu/);
  assert.match(text, /Tireur bleu : 0 observation\(s\), 1 pénalité\(s\), 0 avertissement\(s\), 1 carton\(s\) — 3 point\(s\) à l'adversaire/);
  assert.match(text, /Tireur \(couleur non précisée\) : 1 observation/);
});
