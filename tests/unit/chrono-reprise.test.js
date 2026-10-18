// Machine à états du chrono (js/chrono.js) — reprise, arrêts, fin du temps, fin de l'assaut (C2 à C6, C10, C16). Règles du corpus fonctionnel (docs/corpus-fonctionnel.md)
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

test('réglages modifiés en cours de reprise : le temps en cours n\'est pas touché', () => {
  const h = setup({ roundSec: 90, rounds: 2, restSec: 10 });
  h.chrono.allez(); h.advance(10_000);
  h.setCfg({ roundSec: 120 });
  near(h.st.remaining, 80);
  h.chrono.endReprise(); h.advance(10_000);
  h.setCfg({ rounds: 2 });
  assert.equal(h.st.round, 2, 'reprise 2 sur 2 : pas de réinitialisation');
});
