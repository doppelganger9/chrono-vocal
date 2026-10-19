// Machine à états du chrono (js/chrono.js) — sanctions et rappels (C15). Règles du corpus fonctionnel (docs/corpus-fonctionnel.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const restAfterRound1 = () => {
  const h = setup({ rounds: 3, roundSec: 60, restSec: 60 });
  h.chrono.allez(); h.advance(60_000); h.chrono.endReprise();
  return h;
};

test('les sanctions sont rattachées à l\'arrêt en cours de la reprise', () => {
  const h = setup({ roundSec: 20 });
  h.chrono.allez(); h.chrono.stop();
  const ev = h.chrono.addEvent({ type: 'penalite', pts: 1, color: 'bleu' });
  assert.deepEqual({ ...ev, t: 0 }, { type: 'penalite', pts: 1, color: 'bleu', round: 1, t: 0, stop: 0 });
  assert.equal(h.bout.events.length, 1);
});

test('une sanction sans arrêt dans la reprise en cours n\'est rattachée à aucun arrêt', () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 20 });
  h.chrono.allez(); h.chrono.stop(); h.chrono.allez(); h.advance(10_000); h.chrono.endReprise(); h.advance(20_000); h.chrono.allez();
  assert.equal(h.chrono.addEvent({ type: 'observation', pts: 0 }).stop, null);
  assert.equal(setup().chrono.addEvent({ type: 'observation' }).stop, null, 'aucun arrêt du tout');
});

test('C15 : 1er, 2e, 3e rappel d\'un tireur → observation, pénalité, carton jaune', () => {
  const h = restAfterRound1();
  assert.equal(h.st.phase, 'rest');
  const r = [1, 2, 3].map(() => h.chrono.rappel('bleu'));
  assert.deepEqual(r.map(e => [e.type, e.pts, e.rappel]), [['observation', 0, 1], ['penalite', 1, 2], ['carton-jaune', 2, 3]]);
  for (const e of r) {
    assert.equal(e.color, 'bleu');
    assert.equal(e.detail, "retard à l'appel");
    assert.equal(e.round, 2, 'le rappel concerne la reprise appelée');
    assert.equal(e.stop, null, 'pas rattaché à un arrêt de la reprise précédente');
  }
  assert.deepEqual(h.bout.events, r);
});

test('C15 : les rappels se comptent par tireur, sur tout l\'assaut', () => {
  const h = restAfterRound1();
  assert.equal(h.chrono.rappel('bleu').type, 'observation');
  assert.equal(h.chrono.rappel('rouge').type, 'observation', 'le rang ne dépend que du tireur');
  h.chrono.endRest();
  assert.equal(h.st.phase, 'ready');
  assert.equal(h.chrono.rappel('bleu').type, 'penalite', 'en « prêt » aussi, et le compte continue');
  h.chrono.allez(); h.advance(60_000); h.chrono.endReprise();
  assert.equal(h.chrono.rappel('bleu').type, 'carton-jaune');
  assert.equal(h.chrono.rappel('bleu').type, 'carton-jaune', 'au-delà du 3e : carton jaune à nouveau');
  assert.equal(h.chrono.rappel('rouge').rappel, 2);
});

test('C15 : pas de rappel pendant une reprise, avant l\'assaut ni après', () => {
  const h = setup({ rounds: 1, roundSec: 60 });
  assert.equal(h.chrono.rappel('bleu'), null, 'avant la 1re reprise : rien à rattacher');
  h.chrono.allez();
  assert.equal(h.chrono.rappel('bleu'), null, 'pendant la reprise');
  h.advance(61_000);
  assert.equal(h.chrono.rappel('bleu'), null, 'en temps dépassé');
  h.chrono.endReprise();
  assert.equal(h.st.phase, 'done');
  assert.equal(h.chrono.rappel('bleu'), null, 'assaut terminé');
  assert.equal(h.bout.events.length, 0);
});

test('C15 : un rappel n\'a pas de rang sans couleur de tireur', () => {
  const h = restAfterRound1();
  assert.equal(h.chrono.rappel(''), null);
  assert.equal(h.bout.events.length, 0);
});
