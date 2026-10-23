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
    "Regard",
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

test("préambule du protocole avant « en garde » ignoré ; « hangar » = « en garde » (#79)", () => {
  const p = (t) => L.parseCommand(t);
  assert.deepEqual(p("Tireurs au centre, tireurs en garde, allez"), {
    enGarde: true,
    cmd: "ALLEZ",
    end: null,
  });
  assert.deepEqual(p("Deuxième reprise, tireurs en garde"), {
    enGarde: true,
    cmd: null,
    end: null,
  });
  assert.deepEqual(p("Reprise supplémentaire, en garde, allez"), {
    enGarde: true,
    cmd: "ALLEZ",
    end: null,
  });
  assert.deepEqual(p("Hangar"), { enGarde: true, cmd: null, end: null });
  assert.deepEqual(p("Tireur hangar, allez"), {
    enGarde: true,
    cmd: "ALLEZ",
    end: null,
  });
  // d'autres mots avant « en garde » : ce n'est pas un commandement
  assert.equal(p("Observation tireur bleu, en garde, allez"), null);
  assert.equal(p("Le public en garde allez"), null);
  assert.equal(p("Tireurs au centre"), null);
  assert.equal(p("Bravo le public allez"), null);
  assert.deepEqual(p("Tireurs, allez"), {
    enGarde: false,
    cmd: "ALLEZ",
    end: null,
  });
  // chaque mot du préambule, et seulement le mot entier
  for (const t of [
    "Première reprise, en garde",
    "Troisième reprise, en garde",
    "Quatrième reprise, en garde",
    "Dernière reprise, en garde",
    "À la reprise, en garde",
    "Tire, tireurs, en garde",
  ])
    assert.deepEqual(p(t), { enGarde: true, cmd: null, end: null }, t);
  for (const t of [
    "Aux tireurs, en garde, allez",
    "Voilà, en garde, allez",
    "Tirage, en garde, allez",
    "Satire, en garde, allez",
    "Hangars, allez",
    "Changar, allez",
  ])
    assert.equal(p(t), null, t);
});

test("« fin de la deuxième reprise » : le rang de la reprise est accepté, quel qu'il soit (#109)", () => {
  const fin = { enGarde: false, cmd: "STOP", end: "reprise" };
  for (const t of [
    "Stop, fin de la deuxième reprise",
    "Stop, fin de la 2e reprise",
    "Stop, fin de la 2ème reprise",
    "fin de la deuxième reprise",
    "Fin de la première reprise",
    "fin de la 1re reprise",
    "fin de la 1ère reprise",
    "fin de la seconde reprise",
    "fin de la troisième reprise",
    "fin de la quatrième reprise",
    "fin de la dernière reprise",
    "fin de la reprise supplémentaire",
    "fin de la 3 reprise",
  ])
    assert.deepEqual(L.parseCommand(t), fin, t);
  assert.deepEqual(
    L.parseCommand("Stop, fin de la deuxième reprise et de l'assaut"),
    {
      ...fin,
      end: "assaut",
    },
  );
  // seulement un rang : un autre mot entre « la » et « reprise » n'est pas la fin protocolaire
  for (const t of [
    "fin de la belle reprise",
    "fin de la deuxième belle reprise",
    "fin de la 2x reprise",
  ])
    assert.equal(L.parseCommand(t), null, t);
});

test("« Stop, temps » : « temps » après « stop » ne change rien au commandement (#109)", () => {
  assert.deepEqual(L.parseCommand("Stop, temps"), {
    enGarde: false,
    cmd: "STOP",
    end: null,
  });
  assert.deepEqual(L.parseCommand("Stop, temps, fin de la deuxième reprise"), {
    enGarde: false,
    cmd: "STOP",
    end: "reprise",
  });
  assert.deepEqual(L.parseCommand("stop temps fin de l'assaut"), {
    enGarde: false,
    cmd: "STOP",
    end: "assaut",
  });
  // « temps » seul est l'annonce du chronométreur, pas un commandement
  assert.equal(L.parseCommand("Temps"), null);
  assert.equal(L.parseCommand("Allez temps"), null);
  assert.equal(L.parseCommand("Stop, contretemps"), null);
});

test("fin de la reprise suivie de l'envoi des tireurs dans leurs zones (#109)", () => {
  const fin = { enGarde: false, cmd: "STOP", end: "reprise" };
  for (const t of [
    "Fin de la deuxième reprise tireur dans vos zones",
    "Stop, temps, fin de la première reprise, tireurs, dans vos zones",
    "Fin de la reprise, tireurs, en zone neutre",
    "fin de la reprise dans vos zones",
  ])
    assert.deepEqual(L.parseCommand(t), fin, t);
  assert.deepEqual(
    L.parseCommand("Stop, fin de l'assaut, tireurs dans vos zones"),
    { ...fin, end: "assaut" },
  );
  // la suite ne peut être que l'envoi en zone : une autre phrase n'est pas la fin protocolaire
  assert.equal(L.parseCommand("la fin de la reprise approche, tireurs"), null);
  assert.equal(L.parseCommand("fin de la reprise, tireurs, au centre"), null);
  // sans « fin de la reprise », l'envoi en zone ne fait rien
  for (const t of [
    "Tireurs, dans vos zones",
    "Tireurs, dans vos zones, équipez-vous",
    "Tireurs, en zone neutre",
  ])
    assert.equal(L.parseCommand(t), null, t);
});

test("« Tireurs, en garde » mal entendu : « regarde », « erreur », « Thierry », « tu iras »… (#111)", () => {
  const eg = { enGarde: true, cmd: null, end: null };
  for (const t of [
    "Regarde",
    "On regarde",
    "erreur en garde",
    "terreur en garde",
    "tu iras en garde",
    "Thierry en garde",
    "tirant en garde",
    "tiroir en garde",
    "erreur regarde",
  ])
    assert.deepEqual(L.parseCommand(t), eg, t);
  for (const t of ["regarde aller", "Regarde allez", "erreur en garde allez"])
    assert.deepEqual(L.parseCommand(t), { ...eg, cmd: "ALLEZ" }, t);
  // seuls, ces mots ne font rien ; ni devant un autre commandement
  for (const t of [
    "erreur",
    "Thierry",
    "tu iras",
    "erreur allez",
    "Thierry stop",
    "Thierry en zone neutre",
    "terreur équipez-vous",
    "erreur dans vos zones",
    "regarde le tireur bleu",
  ])
    assert.equal(L.parseCommand(t), null, t);
});

test("phrases du protocole affichées par le mode formation : rien d'autre que ce qui est prévu (#109)", () => {
  const c = ["rouge", "bleu"];
  for (const t of [
    "Tireurs, au centre, pour la présentation",
    "Tireurs, dans vos zones, équipez-vous",
    "Tireur, équipez-vous sur l'aire",
    "Première reprise",
    "Début de la première reprise",
    "Début de la deuxième reprise",
    "Tireurs, dans vos zones",
    "Juges, prêts ?",
    "Juges ensemble",
    "Tireurs au centre",
    "Second, venez aider votre tireur",
  ])
    assert.equal(L.classify(t, {}, c).kind, "none", t);
  assert.deepEqual(L.classify("Stop, temps", {}, c), {
    kind: "command",
    cmd: "STOP",
    enGarde: false,
    end: null,
  });
  assert.equal(L.classify("Fin de la deuxième reprise", {}, c).end, "reprise");
});

test("une phrase qui finit par « chrono » vaut l'appel « Chrono » (#109)", () => {
  assert.equal(
    L.isChronoCall(
      "Pour la deuxième reprise tireur en garde juge un prêt juge deux prêt juge trois après chrono",
    ),
    true,
  );
  assert.equal(L.isChronoCall("juge 3, chrono ?"), true);
  assert.equal(L.isChronoCall("chrono chrono"), true);
  assert.equal(L.isChronoCall("le chrono tourne"), false);
  assert.equal(L.isChronoCall("chronométreur"), false);
  assert.equal(L.isChronoCall(""), false);
  assert.equal(
    L.classify("juge un prêt juge deux prêt juge trois après chrono").kind,
    "chrono",
  );
});
