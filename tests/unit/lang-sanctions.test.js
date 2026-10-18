// Sanctions et rappels annoncés par l'arbitre (js/lang.js) : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../js/lang.js';

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

test('sanctions : pluriel, et sortie d\'aire ou lâcher de canne sans le mot « pénalité » (#47)', () => {
  const colors = ['rouge', 'bleu'];
  assert.equal(L.parseMotif('Observations rouge, défaut de priorité', colors).type, 'observation');
  assert.deepEqual(L.parseMotif("Pour sortie d'air tir en bleu", colors), { type: 'penalite', pts: 1, detail: "sortie d'aire", color: 'bleu' });
  assert.deepEqual(L.parseMotif('lâcher de canne tireur rouge', colors), { type: 'penalite', pts: 1, detail: 'lâcher de canne', color: 'rouge' });
  assert.deepEqual(L.parseMotif("pénalités pour sortie d'aire bleu", colors), { type: 'penalite', pts: 1, detail: "sortie d'aire", color: 'bleu' });
  assert.equal(L.parseMotif('sortie', colors), null);
});

test('parseRappel : « rappel, tireur bleu » et ses variantes (#8)', () => {
  const colors = ['rouge', 'bleu'];
  assert.deepEqual(L.parseRappel('Rappel, tireur bleu', colors), { color: 'bleu' });
  assert.deepEqual(L.parseRappel('deuxième rappel au tireur rouge', colors), { color: 'rouge' });
  assert.deepEqual(L.parseRappel('rappels bleu', colors), { color: 'bleu' });
  assert.deepEqual(L.parseRappel('rappel', colors), { color: null }, 'sans couleur : le rappel est reconnu, le tireur non');
  assert.equal(L.parseRappel('Pénalité tireur bleu', colors), null);
  assert.equal(L.parseRappel('la pelle', colors), null);
  assert.deepEqual(L.parseRappel('rappel tireur bleu'), { color: null }, 'sans liste de couleurs');
});

test('classify : un rappel passe avant les sanctions', () => {
  assert.deepEqual(L.classify('rappel tireur bleu, observation', {}, ['rouge', 'bleu']), { kind: 'rappel', color: 'bleu' });
});
