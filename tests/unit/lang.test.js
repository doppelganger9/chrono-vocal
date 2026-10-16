// Tests unitaires de lang.js : node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../lang.js');

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

test("parseReferee comprend les phrases de l'arbitre", () => {
  const cases = [
    ["Pour un assaut en 3 reprises d'une minute trente, avec 1 min de repos", { rounds: 3, roundSec: 90, restSec: 60 }],
    ['pour un assaut en 3 rounds d 1 minute 30 avec 1 minute de pause', { rounds: 3, roundSec: 90, restSec: 60 }],
    ['assaut en deux reprises de 2 minutes avec une pause de 1 minute', { rounds: 2, roundSec: 120, restSec: 60 }],
    ['4 reprises de 2 min, 45 secondes de repos', { rounds: 4, roundSec: 120, restSec: 45 }],
    ['une reprise de 1 minute et demie', { rounds: 1, roundSec: 90 }],
    ['3 reprises de 1:30 avec 1:00 de repos', { rounds: 3, roundSec: 90, restSec: 60 }],
    ['3 reprises de 2 minutes avec repos', { rounds: 3, roundSec: 120 }],
    ['assaut 3 reprises, repos d une minute, reprises de deux minutes', { rounds: 3, roundSec: 120, restSec: 60 }],
  ];
  for (const [phrase, expected] of cases) assert.deepEqual(L.parseReferee(phrase), expected, phrase);
});

test('parseReferee refuse plus de 4 reprises (maximum en compétition)', () => {
  assert.deepEqual(L.parseReferee('assaut en 5 reprises de 2 minutes'), { tooMany: 5, roundSec: 120 });
});

test('buildSentence puis parseReferee redonne le même format, pour chaque préréglage', () => {
  for (const [rounds, roundSec] of [[2, 90], [3, 90], [3, 120], [4, 120], [4, 90]]) {
    const c = { mode: 'assaut', rounds, roundSec, restSec: 60 };
    assert.deepEqual(L.parseReferee(L.buildSentence(c)), { rounds, roundSec, restSec: 60 });
  }
});

test('parseCommand reconnaît STOP / ALLEZ / REPOS et leurs variantes', () => {
  const cases = {
    ALLEZ: ['Allez', 'allez !', 'aller', 'allé', 'Hallez', 'à les', "À l'est", 'allais', 'Allez-y', 'olé', 'Allez allez'],
    STOP: ['Stop', 'stop.', 'Top', 'stoppez'],
    REPOS: ['Repos'],
  };
  for (const [name, variants] of Object.entries(cases)) {
    for (const v of variants) assert.equal(L.parseCommand(v)?.cmd, name, v);
  }
  for (const v of ['Allô', 'alors', 'stock', 'tôt', 'a', 'les tireurs se mettent en place pour le salut']) {
    assert.equal(L.parseCommand(v), null, v);
  }
});

test('parseCommand suit le protocole : « en garde », « … fin de la reprise »', () => {
  assert.deepEqual(L.parseCommand('En garde, allez'), { enGarde: true, cmd: 'ALLEZ' });
  assert.deepEqual(L.parseCommand('en garde'), { enGarde: true, cmd: null });
  assert.deepEqual(L.parseCommand('en gare'), { enGarde: true, cmd: null });
  assert.deepEqual(L.parseCommand('Stop, fin de la reprise'), { enGarde: false, cmd: 'STOP' });
  assert.deepEqual(L.parseCommand("Stop, fin de l'assaut"), { enGarde: false, cmd: 'STOP' });
});

test('parseCommand utilise les variantes apprises', () => {
  assert.equal(L.parseCommand('Allô'), null);
  assert.equal(L.parseCommand('Allô', { ALLEZ: [L.phon('Allô')] })?.cmd, 'ALLEZ');
});

test('isReadyCheck repère « Chrono, prêt ? »', () => {
  assert.equal(L.isReadyCheck('Chrono, prêt ?'), true);
  assert.equal(L.isReadyCheck('chronométreur prêt'), true);
  assert.equal(L.isReadyCheck('Juge 1, prêt ?'), false);
});

test("parseMotif reconnaît les sanctions et la couleur du tireur", () => {
  const colors = ['rouge', 'bleu'];
  const cases = [
    ["Pénalité pour sortie d'aire, tireur bleu", { type: 'penalite', pts: 1, detail: "sortie d'aire", color: 'bleu' }],
    ['pénalité pour lâcher de canne tireur rouge', { type: 'penalite', pts: 1, detail: 'lâcher de canne', color: 'rouge' }],
    ['Observation rouge, contrôle de la puissance', { type: 'observation', pts: 0, color: 'rouge' }],
    ['demande d avertissement au tireur bleu pour antijeu', { type: 'demande-avert', pts: 0, color: 'bleu' }],
    ['Avertissement prononcé, tireur rouge', { type: 'avertissement', pts: 2, color: 'rouge' }],
    ['avertissement refusé', { type: 'avert-refuse', pts: 0, color: null }],
    ['Carton jaune au tireur bleu', { type: 'carton-jaune', pts: 2, color: 'bleu' }],
    ['disqualification', { type: 'disqualification', pts: 0, color: null }],
    ['arbitre, abandon', { type: 'abandon', pts: 0, color: null }],
  ];
  for (const [phrase, expected] of cases) assert.deepEqual(L.parseMotif(phrase, colors), expected, phrase);
  assert.equal(L.parseMotif('allez', colors), null);
});

test("parseMotif : « carton rouge » ne désigne pas le tireur rouge", () => {
  assert.equal(L.parseMotif('carton rouge au tireur bleu', ['rouge', 'bleu']).color, 'bleu');
  assert.equal(L.parseMotif('carton rouge', ['rouge', 'bleu']).color, null);
});
