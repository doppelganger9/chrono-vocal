// Machine à états du chrono (js/chrono.js) — prolongation de 30 s (C11). Règles du corpus fonctionnel (docs/corpus-fonctionnel.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 0.11, `${msg ?? ''} ${actual} ≈ ${expected}`);

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

test('prolongation pendant un long temps dépassé : on reste en temps dépassé', () => {
  const h = setup({ roundSec: 10, countStops: false, prolong: 'propose' });
  h.chrono.allez(); h.advance(2000);
  h.chrono.stop(); h.advance(48_000); h.chrono.allez();   // 40 s de dépassement
  h.chrono.prolong();
  assert.equal(h.st.phase, 'overtime');
  near(h.st.remaining, -10);
});
