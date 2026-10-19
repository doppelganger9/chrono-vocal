// Couleur du tireur dans une phrase : la couleur est du texte, pas une expression régulière (#55)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../../js/lang.js";

test("findColor : couleur trouvée en mot entier, accents et majuscules ignorés", () => {
  assert.equal(
    L.findColor("observation tireur bleu", ["rouge", "bleu"]),
    "bleu",
  );
  assert.equal(
    L.findColor("Pénalité tireur Écarlate", ["écarlate", "bleu"]),
    "écarlate",
  );
  assert.equal(
    L.findColor("observation bleuet", ["rouge", "bleu"]),
    null,
    "pas un morceau de mot",
  );
  assert.equal(
    L.findColor("observation sousbleu", ["rouge", "bleu"]),
    null,
    "pas une fin de mot",
  );
  assert.equal(L.findColor("observation", ["rouge", "bleu"]), null);
  assert.equal(
    L.findColor("observation", ["", "bleu"]),
    null,
    "couleur vide ignorée",
  );
  assert.equal(L.findColor("rouge", []), null);
});

test("findColor : une couleur avec des caractères spéciaux ne casse rien et ne correspond pas à tout", () => {
  assert.doesNotThrow(() =>
    L.parseMotif("observation bleu", ["bleu(", "rouge"]),
  );
  assert.equal(
    L.findColor("observation tireur rouge", [".*", "rouge"]),
    "rouge",
    "« .* » n'est pas un joker",
  );
  assert.equal(L.findColor("rappel bleu", ["[", "bleu"]), "bleu");
  assert.doesNotThrow(() => L.parseRappel("rappel bleu", ["(?<", "bleu"]));
});
