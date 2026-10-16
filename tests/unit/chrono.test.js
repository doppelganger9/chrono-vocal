// Machine à états du chrono (js/chrono.js) : règles C1 à C16 du corpus fonctionnel
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 0.11, `${msg ?? ''} ${actual} ≈ ${expected}`);

test('C2 : le temps ne court qu\'à partir du « allez »', () => {
  const h = setup({ roundSec: 90 });
  h.advance(5000);
  assert.equal(h.st.phase, 'ready');
  near(h.st.remaining, 90);
  const before = h.changes;
  assert.equal(h.chrono.allez(), true);
  assert.deepEqual(h.events.at(-1), { type: 'allez', resume: false });
  assert.ok(h.changes > before, 'l\'écran est redessiné');
  h.advance(4000);
  assert.equal(h.st.phase, 'round');
  near(h.st.remaining, 86);
});

test('C3 : « stop » fige le chrono (arrêts décomptés), « allez » le relance ; l\'arrêt est enregistré', () => {
  const h = setup({ roundSec: 90 });
  h.chrono.allez(); h.advance(10_000);
  assert.equal(h.chrono.stop(), true);
  assert.equal(h.events.at(-1).type, 'stop');
  assert.equal(h.st.halt, true);
  h.advance(5000);
  near(h.st.remaining, 80, 'figé');
  assert.equal(h.chrono.stop(), false, 'déjà arrêté');
  h.chrono.allez();
  assert.deepEqual(h.events.at(-1), { type: 'allez', resume: true });
  h.advance(2000);
  near(h.st.remaining, 78);
  assert.equal(h.bout.stops.length, 1);
  near(h.bout.stops[0].at, 10);
  near(h.bout.stops[0].dur, 5);
  assert.equal(h.bout.stops[0].round, 1);
});

test('C10 : arrêts non décomptés, le chrono continue pendant l\'arrêt', () => {
  const h = setup({ roundSec: 90, countStops: false });
  h.chrono.allez(); h.advance(10_000);
  h.chrono.stop(); h.advance(5000);
  assert.equal(h.st.halt, true);
  near(h.st.remaining, 75);
  h.chrono.allez();
  near(h.bout.stops[0].dur, 5);
});

test('fin du temps : « temps », puis temps dépassé compté, « Temps » répété toutes les 5 s sauf pendant un arrêt', () => {
  const h = setup({ roundSec: 10 });
  h.chrono.allez(); h.advance(10_000);
  assert.equal(h.st.phase, 'overtime');
  assert.deepEqual(h.types().slice(-2), ['temps', 'time-up']);
  h.clear(); h.advance(4900);
  assert.deepEqual(h.types(), []);
  h.advance(200);
  assert.deepEqual(h.events, [{ type: 'overtime-call', over: h.events[0].over }]);
  near(h.events[0].over, 5);
  near(h.chrono.overtime(), 5.1);
  h.chrono.stop(); h.clear(); h.advance(20_000);
  assert.deepEqual(h.types(), [], 'pas de répétition pendant un arrêt');
  near(h.chrono.overtime(), 5.1, 'arrêt décompté : dépassement figé');
  h.chrono.allez(); h.advance(5000);
  assert.ok(h.types().includes('overtime-call'));
});

test('C4, C6 : la reprise ne se termine que sur décision de l\'arbitre, à tout moment', () => {
  const h = setup({ roundSec: 10, rounds: 2 });
  assert.equal(h.chrono.endReprise(), false, 'avant le « allez »');
  h.chrono.allez(); h.advance(9700);
  h.chrono.stop();                                   // « stop » juste avant « temps »
  near(h.st.remaining, 0.3);
  assert.equal(h.chrono.endReprise(), true);
  assert.equal(h.st.phase, 'rest');
  assert.equal(h.events.at(-1).type, 'reprise-end');
  assert.equal(h.chrono.endReprise(), false, 'pendant le repos');
  assert.ok(h.bout.rounds[1].end);
});

test('le temps dépassé est enregistré dans la reprise', () => {
  const h = setup({ roundSec: 10, rounds: 2 });
  h.chrono.allez(); h.advance(17_000);
  h.chrono.endReprise();
  near(h.bout.rounds[1].over, 7);
});

test('C7, C8 : annonces du repos à 30, 15 et 5 s, puis « temps » et attente du « allez »', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, calls: [30, 15, 5] });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise(); h.clear();
  h.advance(29_900);
  assert.deepEqual(h.types(), []);
  h.advance(200);
  assert.deepEqual(h.events, [{ type: 'rest-call', sec: 30 }]);
  h.advance(15_000);
  assert.deepEqual(h.events.at(-1), { type: 'rest-call', sec: 15 });
  h.advance(10_000);
  assert.deepEqual(h.events.at(-1), { type: 'rest-call', sec: 5 });
  h.advance(5000);
  assert.equal(h.events.at(-1).type, 'temps');
  assert.equal(h.st.phase, 'ready');
  assert.equal(h.st.round, 2);
  near(h.st.remaining, 10);
  assert.equal(h.st.running, false);
});

test('une annonce de repos n\'est pas faite si elle est dépassée de plus de 1,5 s', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 20, calls: [30, 15] });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise(); h.clear();
  h.advance(20_000);
  assert.deepEqual(h.events.filter(e => e.type === 'rest-call'), [{ type: 'rest-call', sec: 15 }], '30 s ≥ durée du repos : jamais');
});

test('« stop » pendant le repos le fige ; « fin du repos » passe à la reprise suivante', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60 });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise();
  h.advance(10_000); h.chrono.stop(); h.advance(10_000);
  near(h.st.remaining, 50);
  h.chrono.allez();
  assert.equal(h.chrono.endRest(), true);
  assert.equal(h.st.phase, 'ready');
  assert.equal(h.st.round, 2);
  assert.equal(h.bout.stops.length, 0, 'les arrêts du repos ne comptent pas');
});

test('fin de l\'assaut après la dernière reprise', () => {
  const h = setup({ roundSec: 10, rounds: 1 });
  h.chrono.allez(); h.advance(11_000);
  h.chrono.endReprise();
  assert.equal(h.st.phase, 'done');
  assert.equal(h.events.at(-1).type, 'finish');
  assert.ok(h.bout.end);
  assert.equal(h.chrono.allez(), false);
  assert.equal(h.chrono.stop(), false);
});

test('C16 : reprise supplémentaire, dans la limite autorisée', () => {
  const h = setup({ roundSec: 10, rounds: 1, restSec: 60, extraMax: 1 });
  assert.equal(h.chrono.extraRound(), false, 'pas avant la fin');
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise();
  assert.equal(h.chrono.extraRound(), true);
  assert.equal(h.events.at(-1).type, 'extra');
  assert.equal(h.st.phase, 'rest');
  assert.equal(h.bout.end, null);
  h.advance(60_000);
  assert.equal(h.st.round, 2);
  assert.equal(h.chrono.isExtra(), true);
  assert.equal(h.chrono.totalRounds(), 2);
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise();
  assert.equal(h.st.phase, 'done');
  assert.equal(h.chrono.extraRound(), false, 'une seule autorisée');
});

test('C11 : prolongation proposée après un arrêt de plus de 30 s (arrêts non décomptés)', () => {
  const h = setup({ roundSec: 60, countStops: false, prolong: 'propose' });
  h.chrono.allez(); h.advance(2000);
  h.chrono.stop(); h.advance(5000); h.chrono.allez();
  assert.equal(h.st.prolongOffer, 0, 'arrêt de 5 s');
  h.chrono.stop(); h.advance(31_000); h.chrono.allez();
  assert.equal(h.events.at(-2).type, 'prolongation-offer');
  assert.ok(h.st.prolongOffer > h.clock.wall());
  near(h.chrono.curMax(), 60, 'rien d\'appliqué d\'office');
  assert.equal(h.chrono.prolong(), true);
  assert.equal(h.events.at(-1).type, 'prolongation');
  near(h.chrono.curMax(), 90);
  near(h.st.remaining, 52);
  assert.equal(h.bout.rounds[1].prolonged, true);
  assert.equal(h.bout.stops.at(-1).prolongation, true);
  assert.equal(h.chrono.prolong(), false, 'une seule fois par reprise');
});

test('C11 : prolongation automatique, jamais si les arrêts sont décomptés ni en relais', () => {
  const auto = setup({ roundSec: 60, countStops: false, prolong: 'auto' });
  auto.chrono.allez(); auto.chrono.stop(); auto.advance(31_000); auto.chrono.allez();
  near(auto.chrono.curMax(), 90);
  for (const o of [{ countStops: true }, { prolong: 'off', countStops: false }, { mode: 'relais', countStops: false, prolong: 'auto' }]) {
    const h = setup({ roundSec: 60, prolong: 'auto', ...o });
    h.chrono.allez(); h.chrono.stop(); h.advance(31_000); h.chrono.allez();
    assert.equal(h.st.prolonged, false, JSON.stringify(o));
  }
});

test('une prolongation pendant le temps dépassé fait revenir dans la reprise', () => {
  const h = setup({ roundSec: 20, countStops: false, prolong: 'propose' });
  h.chrono.allez(); h.advance(5000);
  h.chrono.stop(); h.advance(31_000); h.chrono.allez();   // le temps est écoulé pendant l'arrêt
  assert.equal(h.st.phase, 'overtime');
  h.chrono.prolong();
  assert.equal(h.st.phase, 'round');
  near(h.st.remaining, 14);
});

test('C13 : relais, annonce à chaque minute et fenêtre de 10 s', () => {
  const h = setup({ mode: 'relais', relayBase: 60, relayCount: 2, rounds: 1, roundSec: 240, extraSec: 120 });
  h.chrono.allez(); h.advance(59_900);
  assert.ok(!h.types().includes('relay'));
  h.advance(200);
  assert.equal(h.events.at(-1).type, 'relay');
  assert.equal(h.st.relayUntil, 70);
  h.advance(60_000);
  assert.equal(h.events.filter(e => e.type === 'relay').length, 2);
});

test('annulation : restaurer un instantané fait comme si la commande n\'avait pas eu lieu', () => {
  const h = setup({ roundSec: 20 });
  h.chrono.allez(); h.advance(1000);
  const snap = h.chrono.snapshot();
  h.chrono.stop(); h.advance(2000);
  h.chrono.restore(snap); h.chrono.tick();
  assert.equal(h.st.halt, false);
  near(h.st.remaining, 17, 'le chrono a continué de tourner');
  assert.equal(h.bout.stops.length, 0);
});

test('les sanctions sont rattachées à l\'arrêt en cours de la reprise', () => {
  const h = setup({ roundSec: 20 });
  h.chrono.allez(); h.chrono.stop();
  const ev = h.chrono.addEvent({ type: 'penalite', pts: 1, color: 'bleu' });
  assert.deepEqual({ ...ev, t: 0 }, { type: 'penalite', pts: 1, color: 'bleu', round: 1, t: 0, stop: 0 });
  assert.equal(h.bout.events.length, 1);
});

test('réglages modifiés : le temps affiché suit avant le départ, et une reprise au-delà du nouveau total réinitialise', () => {
  const h = setup({ roundSec: 90, rounds: 3 });
  h.setCfg({ roundSec: 120 });
  near(h.st.remaining, 120);
  h.chrono.allez(); h.advance(120_000); h.chrono.endReprise(); h.advance(60_000);
  assert.equal(h.st.round, 2);
  h.setCfg({ rounds: 1 });
  assert.equal(h.st.round, 1);
  assert.equal(h.st.phase, 'ready');
});

test('reset remet tout à zéro', () => {
  const h = setup({ roundSec: 10 });
  h.chrono.allez(); h.advance(3000); h.chrono.stop();
  h.chrono.reset();
  assert.equal(h.st.phase, 'ready');
  assert.equal(h.st.round, 1);
  assert.equal(h.bout.stops.length, 0);
  assert.equal(h.bout.start, null);
});

// ---------- Cas ajoutés d'après les tests de mutation ----------

test('état initial', () => {
  const h = setup({ roundSec: 90 });
  const { called, ...rest } = h.st;
  assert.deepEqual(rest, { phase: 'ready', round: 1, running: false, halt: false, remaining: 90, deadline: 0,
    extra: 0, bonus: 0, prolonged: false, prolongOffer: 0, relayUntil: null });
  assert.equal(called.size, 0);
  assert.equal(h.chrono.overtime(), 0);
});

test('« allez » sans effet pendant que le chrono tourne ; « stop » sans effet avant le départ', () => {
  const h = setup();
  assert.equal(h.chrono.stop(), false);
  h.chrono.allez();
  assert.equal(h.chrono.allez(), false);
});

test('l\'assaut garde son journal d\'une reprise à l\'autre', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 20 });
  h.chrono.allez(); h.advance(2000); h.chrono.stop(); h.advance(1000); h.chrono.allez();
  const start = h.bout.start;
  h.advance(8000); h.chrono.endReprise(); h.advance(20_000); h.chrono.allez();
  assert.equal(h.bout.start, start);
  assert.equal(h.bout.stops.length, 1);
  assert.deepEqual(Object.keys(h.bout.rounds), ['1', '2']);
  assert.equal(h.bout.rounds[2].start, h.clock.wall());
  assert.equal(h.bout.rounds[2].end, null);
  assert.equal(h.bout.rounds[2].prolonged, false);
});

test('pas d\'annonce de repos ni de relais pendant une reprise d\'assaut', () => {
  const h = setup({ roundSec: 120, calls: [30, 15, 5] });
  h.chrono.allez(); h.advance(119_000);
  assert.deepEqual(h.events.filter(e => e.type === 'rest-call' || e.type === 'relay'), []);
});

test('annonce de repos à l\'instant exact, et jamais si elle égale la durée du repos', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, calls: [60, 30] });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise(); h.clear();
  h.advance(30_000);
  assert.deepEqual(h.events, [{ type: 'rest-call', sec: 30 }]);
});

test('relais : pas d\'annonce dans les 2 dernières secondes', () => {
  const h = setup({ mode: 'relais', relayBase: 60, relayCount: 1, rounds: 1, roundSec: 120 });
  h.chrono.allez(); h.advance(121_000);
  assert.equal(h.events.filter(e => e.type === 'relay').length, 1);
});

test('« stop » pendant le repos le fige même si les arrêts ne sont pas décomptés', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, countStops: false });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise();
  h.chrono.stop(); h.advance(10_000);
  near(h.st.remaining, 60);
  assert.equal(h.st.running, false);
});

test('fin de reprise pendant un arrêt : l\'arrêt est clos, le repos démarre normalement', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60 });
  h.chrono.allez(); h.advance(5000); h.chrono.stop(); h.advance(3000);
  h.chrono.endReprise();
  assert.equal(h.st.halt, false);
  assert.equal(h.st.running, true);
  near(h.bout.stops[0].dur, 3);
  h.advance(2000);
  near(h.bout.stops[0].dur, 3, 'durée figée une fois l\'arrêt clos');
});

test('mesures prises à l\'instant de la commande, même entre deux pas d\'horloge', () => {
  const h = setup({ roundSec: 10, rounds: 2 });
  h.chrono.allez(); h.advance(12_000);
  h.clock.t += 1500;                       // sans tick
  h.chrono.endReprise();
  near(h.bout.rounds[1].over, 3.5);
  const p = setup({ roundSec: 60, countStops: false, prolong: 'propose' });
  p.chrono.allez(); p.chrono.stop(); p.advance(31_000); p.chrono.allez();
  p.clock.t += 1500;
  p.chrono.prolong();
  near(p.st.remaining, 57.5);
  p.advance(1000);
  near(p.st.remaining, 56.5, 'le chrono continue normalement après la prolongation');
});

test('fin de l\'assaut : la commande réussit et le chrono s\'arrête', () => {
  const h = setup({ roundSec: 10, rounds: 1 });
  h.chrono.allez(); h.advance(11_000);
  assert.equal(h.chrono.endReprise(), true);
  assert.equal(h.st.running, false);
  assert.equal(h.chrono.endRest(), false);
});

test('prolongation pendant un long temps dépassé : on reste en temps dépassé', () => {
  const h = setup({ roundSec: 10, countStops: false, prolong: 'propose' });
  h.chrono.allez(); h.advance(2000);
  h.chrono.stop(); h.advance(48_000); h.chrono.allez();   // 40 s de dépassement
  h.chrono.prolong();
  assert.equal(h.st.phase, 'overtime');
  near(h.st.remaining, -10);
});

test('une sanction sans arrêt dans la reprise en cours n\'est rattachée à aucun arrêt', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 20 });
  h.chrono.allez(); h.chrono.stop(); h.chrono.allez(); h.advance(10_000); h.chrono.endReprise(); h.advance(20_000); h.chrono.allez();
  assert.equal(h.chrono.addEvent({ type: 'observation', pts: 0 }).stop, null);
  assert.equal(setup().chrono.addEvent({ type: 'observation' }).stop, null, 'aucun arrêt du tout');
});

test('réglages modifiés en cours de reprise : le temps en cours n\'est pas touché', () => {
  const h = setup({ roundSec: 90, rounds: 2, restSec: 10 });
  h.chrono.allez(); h.advance(10_000);
  h.setCfg({ roundSec: 120 });
  near(h.st.remaining, 80);
  h.chrono.endReprise(); h.advance(10_000);
  h.setCfg({ rounds: 2 });
  assert.equal(h.st.round, 2, 'reprise 2 sur 2 : pas de réinitialisation');
});

test('le repos dure le temps réglé', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 45 });
  h.chrono.allez(); h.advance(10_000); h.chrono.endReprise();
  near(h.chrono.curMax(), 45);
});
