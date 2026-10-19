// Commandements de l'arbitre, « Chrono, prêt ? », anti-écho (js/lang.js) : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../../js/lang.js";

test("parseCommand reconnaît STOP / ALLEZ / REPOS et leurs variantes", () => {
  const cases = {
    ALLEZ: [
      "Allez",
      "allez !",
      "aller",
      "allé",
      "Hallez",
      "à les",
      "À l'est",
      "allais",
      "Allez-y",
      "olé",
      "Allez allez",
    ],
    STOP: ["Stop", "stop.", "Top", "stoppez"],
    REPOS: ["Repos"],
  };
  for (const [name, variants] of Object.entries(cases)) {
    for (const v of variants) assert.equal(L.parseCommand(v)?.cmd, name, v);
  }
  for (const v of [
    "Allô",
    "alors",
    "stock",
    "tôt",
    "a",
    "les tireurs se mettent en place pour le salut",
  ]) {
    assert.equal(L.parseCommand(v), null, v);
  }
});

test("parseCommand suit le protocole : « en garde », « … fin de la reprise »", () => {
  assert.deepEqual(L.parseCommand("En garde, allez"), {
    enGarde: true,
    cmd: "ALLEZ",
    end: null,
  });
  assert.deepEqual(L.parseCommand("en garde"), {
    enGarde: true,
    cmd: null,
    end: null,
  });
  assert.deepEqual(L.parseCommand("en gare"), {
    enGarde: true,
    cmd: null,
    end: null,
  });
  assert.deepEqual(L.parseCommand("Stop"), {
    enGarde: false,
    cmd: "STOP",
    end: null,
  });
});

test("parseCommand repère la fin de reprise ou d'assaut décidée par l'arbitre", () => {
  const cases = {
    "Stop, fin de la reprise": "reprise",
    "stop fin de reprise": "reprise",
    "Stop, fin de l'assaut": "assaut",
    "Stop, fin de la reprise, fin de l'assaut": "assaut",
    "stop fin de la reprise et de l'assaut": "assaut",
    "fin de la reprise": "reprise",
  };
  for (const [phrase, end] of Object.entries(cases)) {
    assert.deepEqual(
      L.parseCommand(phrase),
      { enGarde: false, cmd: "STOP", end },
      phrase,
    );
  }
  assert.equal(
    L.parseCommand("la fin de la reprise approche, restez concentrés"),
    null,
  );
});

test("parseCommand utilise les variantes apprises", () => {
  assert.equal(L.parseCommand("Allô"), null);
  assert.equal(
    L.parseCommand("Allô", { ALLEZ: [L.phon("Allô")] })?.cmd,
    "ALLEZ",
  );
});

test("isReadyCheck repère « Chrono, prêt ? »", () => {
  assert.equal(L.isReadyCheck("Chrono, prêt ?"), true);
  assert.equal(L.isReadyCheck("chronométreur prêt"), true);
  assert.equal(L.isReadyCheck("Juge 1, prêt ?"), false);
});

test("parseCommand : variantes et faux amis", () => {
  assert.equal(L.parseCommand("alllez")?.cmd, "ALLEZ"); // lettre répétée
  assert.equal(L.parseCommand("estop")?.cmd, "STOP");
  assert.equal(L.parseCommand("repo")?.cmd, "REPOS");
  for (const v of [
    "allez stop",
    "stoppeur",
    "aller simple",
    "reposer",
    "stop stop stop stop",
    "stop fin",
  ]) {
    assert.equal(L.parseCommand(v), null, v);
  }
  assert.deepEqual(L.parseCommand("engarde"), {
    enGarde: true,
    cmd: null,
    end: null,
  });
});

test("isReadyCheck tolère la ponctuation collée", () => {
  assert.equal(L.isReadyCheck("Chrono,prêt?"), true);
});

test("« en garde » : variantes relevées en recette, sans faux positifs (#47)", () => {
  for (const t of [
    "On garde",
    "Garde",
    "Sans garde",
    "Tireur en garde",
    "Tireurs en garde",
    "Tire en garde",
    "Tir en garde",
  ])
    assert.deepEqual(
      L.parseCommand(t),
      { enGarde: true, cmd: null, end: null },
      t,
    );
  assert.deepEqual(L.parseCommand("Tireurs en garde, allez"), {
    enGarde: true,
    cmd: "ALLEZ",
    end: null,
  });
  assert.deepEqual(L.parseCommand("San garde"), {
    enGarde: true,
    cmd: null,
    end: null,
  });
  assert.deepEqual(
    L.parseCommand("Tireur garde"),
    { enGarde: true, cmd: null, end: null },
    "deux mots seulement",
  );
  for (const t of [
    "On regarde",
    "Regarde",
    "Garderie",
    "Tireur",
    "Tireur bleu",
    "Satire en garde",
    "Tireuse en garde",
    "garde à vous",
  ])
    assert.equal(L.parseCommand(t), null, t);
});

test("« Chrono » puis « prêt » en deux phrases : isChronoCall et isPretAlone (#47)", () => {
  assert.equal(L.isChronoCall("Chrono"), true);
  assert.equal(L.isChronoCall("Chrono ?"), true);
  assert.equal(L.isChronoCall("Chrono prêt"), false);
  assert.equal(L.isChronoCall("le chrono tourne"), false);
  assert.equal(L.isPretAlone("Prêt"), true);
  assert.equal(L.isPretAlone("Près ?"), true);
  assert.equal(L.isPretAlone("prêts"), true);
  assert.equal(L.isPretAlone("prêt pour le salut"), false);
  assert.equal(L.isPretAlone("après"), false);
  assert.equal(L.isPretAlone("prêtre"), false);
});

test("isEcho : ce que le micro entend pendant une annonce est-il l'annonce elle-même ? (#45)", () => {
  assert.equal(L.isEcho("temps", "Temps"), true);
  assert.equal(L.isEcho("Prêt", "Prêt"), true, "accents et majuscules ignorés");
  assert.equal(L.isEcho("trente secondes", "Trente secondes"), true);
  assert.equal(
    L.isEcho("secondes", "Trente secondes"),
    true,
    "une partie de l'annonce",
  );
  assert.equal(L.isEcho("Temps", "Trente secondes"), false);
  assert.equal(
    L.isEcho("Stop, fin de la reprise", "Temps"),
    false,
    "l'arbitre parle pendant l'annonce",
  );
  assert.equal(
    L.isEcho("temps stop", "Temps"),
    false,
    "un mot de plus que l'annonce",
  );
  assert.equal(L.isEcho("", "Temps"), false);
  assert.equal(L.isEcho("temps", ""), false);
});
