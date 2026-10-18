// Formatage : durées, nombres, phrase du format de l'assaut (js/lang.js) : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../js/lang.js';

test('fmt affiche minutes:secondes, arrondi à la seconde supérieure', () => {
  assert.equal(L.fmt(90), '1:30');
  assert.equal(L.fmt(0.2), '0:01');
  assert.equal(L.fmt(0), '0:00');
  assert.equal(L.fmt(-3), '0:00');
  assert.equal(L.fmt(600), '10:00');
});

test('parseMmSs lit les durées saisies dans les réglages', () => {
  for (const [input, sec] of [['1:30', 90], ["1'30", 90], ['2', 120], ['90', 90], ['0:05', 5], ['1.30', 90], ['abc', null]]) {
    assert.equal(L.parseMmSs(input), sec, input);
  }
});

test('durationFr dit les durées comme le chronométreur', () => {
  assert.equal(L.durationFr(90), 'une minute trente');
  assert.equal(L.durationFr(60), 'une minute');
  assert.equal(L.durationFr(120), 'deux minutes');
  assert.equal(L.durationFr(30), 'trente secondes');
  assert.equal(L.durationFr(15), 'quinze secondes');
  assert.equal(L.durationFr(5), 'cinq secondes');
  assert.equal(L.durationFr(45), 'quarante-cinq secondes');
  assert.equal(L.durationFr(1), 'une seconde');
});

test("buildSentence fabrique la phrase de l'arbitre", () => {
  const c = { mode: 'assaut', rounds: 3, roundSec: 90, restSec: 60 };
  assert.equal(L.buildSentence(c), "Pour un assaut en trois reprises d'une minute trente, avec une minute de repos.");
  assert.equal(L.buildSentence({ ...c, rounds: 1, roundSec: 120 }), 'Pour un assaut en une reprise de deux minutes.');
  assert.equal(L.buildSentence({ mode: 'relais', relayCount: 3, roundSec: 540 }),
    'Pour un relais à trois équipiers, en reprise unique de neuf minutes.');
});

test('parseMmSs : bornes et formats tolérés', () => {
  assert.equal(L.parseMmSs(90), 90);              // un nombre, pas seulement du texte
  assert.equal(L.parseMmSs(' 1:30 '), 90);
  assert.equal(L.parseMmSs('1 : 30'), 90);
  assert.equal(L.parseMmSs('10'), 10);            // à partir de 10, ce sont des secondes
  assert.equal(L.parseMmSs('9'), 540);            // en dessous, des minutes
  assert.equal(L.parseMmSs('x1:30'), null);
  assert.equal(L.parseMmSs('1:30x'), null);
  assert.equal(L.parseMmSs('1:300'), null);
});

test('numFr : tous les nombres dits par l\'app', () => {
  const expected = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  expected.forEach((w, n) => assert.equal(L.numFr(n), w, String(n)));
  assert.equal(L.numFr(1, false), 'un');
  assert.equal(L.numFr(20), 'vingt');
  assert.equal(L.numFr(30), 'trente');
  assert.equal(L.numFr(40), 'quarante');
  assert.equal(L.numFr(50), 'cinquante');
  assert.equal(L.numFr(21), 'vingt et un');
  assert.equal(L.numFr(35), 'trente-cinq');
  assert.equal(L.numFr(17), '17');                // pas de mot prévu : le chiffre
  assert.equal(L.numFr(60), '60');
});

test('durationFr : minutes et secondes mêlées', () => {
  assert.equal(L.durationFr(150), 'deux minutes trente');
  assert.equal(L.durationFr(125), 'deux minutes cinq');
  assert.equal(L.durationFr(61), 'une minute une');
  assert.equal(L.durationFr(0), 'zéro seconde');
});

test('normalize : espaces et nombres en lettres seulement s\'ils sont des mots entiers', () => {
  assert.equal(L.normalize('a   b'), 'a b');
  assert.equal(L.normalize('aucun'), 'aucun');
  assert.equal(L.normalize('Trois Reprises'), '3 reprises');
});
