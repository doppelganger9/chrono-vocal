// Machine à états du chrono (js/chrono.js) — relais par équipes (C13). Règles du corpus fonctionnel (docs/corpus-fonctionnel.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

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

test('relais : pas d\'annonce dans les 2 dernières secondes', () => {
  const h = setup({ mode: 'relais', relayBase: 60, relayCount: 1, rounds: 1, roundSec: 120 });
  h.chrono.allez(); h.advance(121_000);
  assert.equal(h.events.filter(e => e.type === 'relay').length, 1);
});
