// Écran titre et « Quoi de neuf » (js/intro.js) — #6
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTRO_VERSION, NEWS, shouldShowIntro, whatsNew, readSeen, markSeen, INTRO_KEY } from '../../js/intro.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };

test('premier lancement : écran titre ; ensuite, plus jamais pour la même version', () => {
  assert.equal(shouldShowIntro(0), true);
  assert.equal(shouldShowIntro(INTRO_VERSION), false);
  assert.equal(shouldShowIntro(INTRO_VERSION - 1), true, 'nouveauté importante depuis la dernière visite');
});

test('« Quoi de neuf » : seulement les nouveautés depuis la dernière présentation vue', () => {
  assert.deepEqual(whatsNew(INTRO_VERSION), []);
  assert.deepEqual(whatsNew(0), [], 'premier lancement : pas de « quoi de neuf », c\'est la présentation');
  const v = NEWS.at(-1).version;
  assert.deepEqual(whatsNew(v - 1).map(n => n.version), [v]);
});

test('version vue : enregistrée, relue, et 0 si le stockage est indisponible', () => {
  const s = memory();
  assert.equal(readSeen(s), 0);
  markSeen(s);
  assert.equal(s.m.get(INTRO_KEY), String(INTRO_VERSION));
  assert.equal(readSeen(s), INTRO_VERSION);
  assert.equal(readSeen({ getItem() { throw new Error('bloqué'); } }), 0);
  assert.doesNotThrow(() => markSeen({ setItem() { throw new Error('plein'); } }));
  assert.equal(readSeen(memory({ [INTRO_KEY]: 'abc' })), 0);
});
