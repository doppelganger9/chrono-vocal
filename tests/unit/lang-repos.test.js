// Ce que l'arbitre doit dire pendant la minute de repos (js/lang.js) : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../js/lang.js';

test('restCue : ce que l\'arbitre doit dire pendant la minute de repos (C7, #43)', () => {
  assert.equal(L.restCue(60), null, 'début du repos : rien');
  assert.equal(L.restCue(30.05), null, 'pas avant 30 s');
  assert.equal(L.restCue(30), 'Tireurs, équipez-vous');
  assert.equal(L.restCue(15.05), 'Tireurs, équipez-vous', 'reste affiché jusqu\'à l\'étape suivante');
  assert.equal(L.restCue(15), 'Tireurs au centre');
  assert.equal(L.restCue(5.05), 'Tireurs au centre');
  assert.equal(L.restCue(5), 'Juge 1, prêt ? … Chrono, prêt ?');
  assert.equal(L.restCue(0), 'Juge 1, prêt ? … Chrono, prêt ?');
});
