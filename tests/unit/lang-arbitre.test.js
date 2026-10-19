// Phrase de l'arbitre : format de l'assaut (js/lang.js) : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../../js/lang.js";

test("parseReferee comprend les phrases de l'arbitre", () => {
  const cases = [
    [
      "Pour un assaut en 3 reprises d'une minute trente, avec 1 min de repos",
      { rounds: 3, roundSec: 90, restSec: 60 },
    ],
    [
      "pour un assaut en 3 rounds d 1 minute 30 avec 1 minute de pause",
      { rounds: 3, roundSec: 90, restSec: 60 },
    ],
    [
      "assaut en deux reprises de 2 minutes avec une pause de 1 minute",
      { rounds: 2, roundSec: 120, restSec: 60 },
    ],
    [
      "4 reprises de 2 min, 45 secondes de repos",
      { rounds: 4, roundSec: 120, restSec: 45 },
    ],
    ["une reprise de 1 minute et demie", { rounds: 1, roundSec: 90 }],
    [
      "3 reprises de 1:30 avec 1:00 de repos",
      { rounds: 3, roundSec: 90, restSec: 60 },
    ],
    ["3 reprises de 2 minutes avec repos", { rounds: 3, roundSec: 120 }],
    [
      "assaut 3 reprises, repos d une minute, reprises de deux minutes",
      { rounds: 3, roundSec: 120, restSec: 60 },
    ],
  ];
  for (const [phrase, expected] of cases)
    assert.deepEqual(L.parseReferee(phrase), expected, phrase);
});

test("parseReferee refuse plus de 4 reprises (maximum en compétition)", () => {
  assert.deepEqual(L.parseReferee("assaut en 5 reprises de 2 minutes"), {
    tooMany: 5,
    roundSec: 120,
  });
});

test("buildSentence puis parseReferee redonne le même format, pour chaque préréglage", () => {
  for (const [rounds, roundSec] of [
    [2, 90],
    [3, 90],
    [3, 120],
    [4, 120],
    [4, 90],
  ]) {
    const c = { mode: "assaut", rounds, roundSec, restSec: 60 };
    assert.deepEqual(L.parseReferee(L.buildSentence(c)), {
      rounds,
      roundSec,
      restSec: 60,
    });
  }
});

test("parseReferee : nombre de reprises, cas limites", () => {
  assert.deepEqual(L.parseReferee("12 reprises"), { tooMany: 12 });
  assert.deepEqual(L.parseReferee("1 round"), { rounds: 1 });
  assert.deepEqual(L.parseReferee("3reprises"), { rounds: 3 });
  assert.deepEqual(L.parseReferee("2 manches"), { rounds: 2 });
  assert.deepEqual(L.parseReferee("1 manche"), { rounds: 1 });
  assert.deepEqual(L.parseReferee("0 reprise"), {});
});

test("parseReferee : durées, cas limites", () => {
  assert.deepEqual(L.parseReferee("3 reprises de 10 minutes"), {
    rounds: 3,
    roundSec: 600,
  });
  assert.deepEqual(L.parseReferee("3 reprises de 11 minutes"), { rounds: 3 }); // plus de 10 min : ignoré
  assert.deepEqual(L.parseReferee("3 reprises de 0 minute"), { rounds: 3 });
  assert.deepEqual(
    L.parseReferee("repos de 45 secondes, 3 reprises de 2 minutes"),
    { rounds: 3, restSec: 45, roundSec: 120 },
  );
  // ni « repos de … » ni « … de repos » : la durée la plus proche du mot « repos »
  assert.deepEqual(
    L.parseReferee(
      "3 reprises de 2 minutes, et entre chaque reprise un repos de presque 1 minute",
    ),
    { rounds: 3, restSec: 60, roundSec: 120 },
  );
});
