// Tests unitaires de lang.js : node --test
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
  assert.deepEqual(L.parseCommand('En garde, allez'), { enGarde: true, cmd: 'ALLEZ', end: null });
  assert.deepEqual(L.parseCommand('en garde'), { enGarde: true, cmd: null, end: null });
  assert.deepEqual(L.parseCommand('en gare'), { enGarde: true, cmd: null, end: null });
  assert.deepEqual(L.parseCommand('Stop'), { enGarde: false, cmd: 'STOP', end: null });
});

test("parseCommand repère la fin de reprise ou d'assaut décidée par l'arbitre", () => {
  const cases = {
    'Stop, fin de la reprise': 'reprise',
    'stop fin de reprise': 'reprise',
    "Stop, fin de l'assaut": 'assaut',
    "Stop, fin de la reprise, fin de l'assaut": 'assaut',
    "stop fin de la reprise et de l'assaut": 'assaut',
    'fin de la reprise': 'reprise',
  };
  for (const [phrase, end] of Object.entries(cases)) {
    assert.deepEqual(L.parseCommand(phrase), { enGarde: false, cmd: 'STOP', end }, phrase);
  }
  assert.equal(L.parseCommand('la fin de la reprise approche, restez concentrés'), null);
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

// ---------- Cas limites, ajoutés d'après les tests de mutation (npm run mutation) ----------

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

test('parseReferee : nombre de reprises, cas limites', () => {
  assert.deepEqual(L.parseReferee('12 reprises'), { tooMany: 12 });
  assert.deepEqual(L.parseReferee('1 round'), { rounds: 1 });
  assert.deepEqual(L.parseReferee('3reprises'), { rounds: 3 });
  assert.deepEqual(L.parseReferee('2 manches'), { rounds: 2 });
  assert.deepEqual(L.parseReferee('1 manche'), { rounds: 1 });
  assert.deepEqual(L.parseReferee('0 reprise'), {});
});

test('parseReferee : durées, cas limites', () => {
  assert.deepEqual(L.parseReferee('3 reprises de 10 minutes'), { rounds: 3, roundSec: 600 });
  assert.deepEqual(L.parseReferee('3 reprises de 11 minutes'), { rounds: 3 });   // plus de 10 min : ignoré
  assert.deepEqual(L.parseReferee('3 reprises de 0 minute'), { rounds: 3 });
  assert.deepEqual(L.parseReferee('repos de 45 secondes, 3 reprises de 2 minutes'), { rounds: 3, restSec: 45, roundSec: 120 });
  // ni « repos de … » ni « … de repos » : la durée la plus proche du mot « repos »
  assert.deepEqual(L.parseReferee('3 reprises de 2 minutes, et entre chaque reprise un repos de presque 1 minute'),
    { rounds: 3, restSec: 60, roundSec: 120 });
});

test('parseCommand : variantes et faux amis', () => {
  assert.equal(L.parseCommand('alllez')?.cmd, 'ALLEZ');      // lettre répétée
  assert.equal(L.parseCommand('estop')?.cmd, 'STOP');
  assert.equal(L.parseCommand('repo')?.cmd, 'REPOS');
  for (const v of ['allez stop', 'stoppeur', 'aller simple', 'reposer', 'stop stop stop stop', 'stop fin']) {
    assert.equal(L.parseCommand(v), null, v);
  }
  assert.deepEqual(L.parseCommand('engarde'), { enGarde: true, cmd: null, end: null });
});

test('isReadyCheck tolère la ponctuation collée', () => {
  assert.equal(L.isReadyCheck('Chrono,prêt?'), true);
});

test('parseMotif : variantes de transcription et cas limites', () => {
  const c = ['rouge', 'bleu'];
  assert.deepEqual(L.parseMotif('carton rouge', c), { type: 'carton-rouge', pts: 2, color: null });
  assert.equal(L.parseMotif('Pénalité, tireur bleu').color, null);            // sans couleurs connues
  assert.deepEqual(L.parseMotif('demande davertissement tireur rouge', c), { type: 'demande-avert', pts: 0, color: 'rouge' });
  assert.equal(L.parseMotif("pénalité pour sortie daire, tireur bleu", c).detail, "sortie d'aire");
  assert.equal(L.parseMotif('pénalité sortie aire bleu', c).detail, "sortie d'aire");
  assert.equal(L.parseMotif('pénalité pour lâché la canne, tireur rouge', c).detail, 'lâcher de canne');
  assert.equal(L.parseMotif('pénalité pour lâcher canne', c).detail, 'lâcher de canne');
  assert.equal(L.parseMotif('pénalité pour équipement incomplet, tireur bleu', c).detail, 'équipement');
  assert.equal(L.parseMotif('pénalité pour retard, tireur rouge', c).detail, 'retard');
  assert.equal(L.parseMotif('pénalité', c).detail, null);
  assert.deepEqual(L.parseMotif('forfait du tireur bleu', c), { type: 'forfait', pts: 0, color: 'bleu' });
  assert.equal(L.parseMotif('observation, tireur rougeaud', c).color, null);  // mot entier seulement
});

test("parseMotif : « demande de disqualification » est une demande, pas une disqualification", () => {
  assert.deepEqual(L.parseMotif('demande de disqualification au tireur rouge', ['rouge', 'bleu']),
    { type: 'demande-avert', pts: 0, color: 'rouge' });
  assert.deepEqual(L.parseMotif("demande d'avertissement ou disqualification au tireur bleu pour antijeu", ['rouge', 'bleu']),
    { type: 'demande-avert', pts: 0, color: 'bleu' });
});

test('« en garde » : variantes relevées en recette, sans faux positifs (#47)', () => {
  for (const t of ['On garde', 'Garde', 'Sans garde', 'Tireur en garde', 'Tireurs en garde', 'Tire en garde', 'Tir en garde'])
    assert.deepEqual(L.parseCommand(t), { enGarde: true, cmd: null, end: null }, t);
  assert.deepEqual(L.parseCommand('Tireurs en garde, allez'), { enGarde: true, cmd: 'ALLEZ', end: null });
  assert.deepEqual(L.parseCommand('San garde'), { enGarde: true, cmd: null, end: null });
  assert.deepEqual(L.parseCommand('Tireur garde'), { enGarde: true, cmd: null, end: null }, 'deux mots seulement');
  for (const t of ['On regarde', 'Regarde', 'Garderie', 'Tireur', 'Tireur bleu', 'Satire en garde', 'Tireuse en garde', 'garde à vous'])
    assert.equal(L.parseCommand(t), null, t);
});

test('sanctions : pluriel, et sortie d\'aire ou lâcher de canne sans le mot « pénalité » (#47)', () => {
  const colors = ['rouge', 'bleu'];
  assert.equal(L.parseMotif('Observations rouge, défaut de priorité', colors).type, 'observation');
  assert.deepEqual(L.parseMotif("Pour sortie d'air tir en bleu", colors), { type: 'penalite', pts: 1, detail: "sortie d'aire", color: 'bleu' });
  assert.deepEqual(L.parseMotif('lâcher de canne tireur rouge', colors), { type: 'penalite', pts: 1, detail: 'lâcher de canne', color: 'rouge' });
  assert.deepEqual(L.parseMotif("pénalités pour sortie d'aire bleu", colors), { type: 'penalite', pts: 1, detail: "sortie d'aire", color: 'bleu' });
  assert.equal(L.parseMotif('sortie', colors), null);
});

test('« Chrono » puis « prêt » en deux phrases : isChronoCall et isPretAlone (#47)', () => {
  assert.equal(L.isChronoCall('Chrono'), true);
  assert.equal(L.isChronoCall('Chrono ?'), true);
  assert.equal(L.isChronoCall('Chrono prêt'), false);
  assert.equal(L.isChronoCall('le chrono tourne'), false);
  assert.equal(L.isPretAlone('Prêt'), true);
  assert.equal(L.isPretAlone('Près ?'), true);
  assert.equal(L.isPretAlone('prêts'), true);
  assert.equal(L.isPretAlone('prêt pour le salut'), false);
  assert.equal(L.isPretAlone('après'), false);
  assert.equal(L.isPretAlone('prêtre'), false);
});
