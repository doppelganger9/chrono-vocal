// Mode formation (#106) : l'aide-mémoire suit le protocole d'après l'état du chrono (js/formation.js) : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formationView, repriseName } from "../../js/formation.js";
import { DEFAULTS } from "../../js/settings.js";

/** @param {Partial<import('../../js/formation.js').FormationContext>} [c] */
const ctx = (c = {}) => ({
  phase: /** @type {import('../../js/types.js').Phase} */ ("ready"),
  halt: false,
  round: 1,
  totalRounds: 3,
  remaining: 90,
  started: false,
  cfg: DEFAULTS,
  ...c,
});
/** Les phrases d'une étape, en texte @param {import('../../js/formation.js').Step | null} s */
const says = (s) => (s ? s.phrases.map((p) => p.text) : null);

test("avant l'assaut : les étapes du protocole, de l'appel à « En garde, allez », d'un toucher à l'autre", () => {
  const first = formationView(ctx());
  assert.equal(first.sequence, "avant");
  assert.equal(first.index, 0);
  assert.equal(first.count, 9);
  assert.equal(first.step.when, "Appel");
  assert.match(says(first.step)[0], /^Sont attendus sur l'aire/);
  assert.deepEqual(says(first.next), ["Tireurs, vérification du matériel"]);
  const all = Array.from({ length: 9 }, (_, i) =>
    says(formationView(ctx(), i).step),
  );
  assert.deepEqual(all.slice(2), [
    ["Tireurs, au centre"],
    ["À ma gauche, en rouge, … ; à ma droite, en bleu, …"],
    ["Tireurs en place pour le salut", "Prêts pour le salut", "Saluez-vous"],
    ["Équipez-vous"],
    [
      "Tireurs au centre",
      "Pour un assaut en trois reprises d'une minute trente, avec une minute de repos",
    ],
    ["Juge 1, prêt ? Juge 2, prêt ? Juge 3, prêt ?", "Chrono, prêt ?"],
    ["En garde", "Allez"],
  ]);
  const last = formationView(ctx(), 8);
  assert.equal(
    last.next,
    null,
    "rien après « allez » : le chrono prend le relais",
  );
  assert.equal(last.step.note, "Le chrono part à « allez ».");
});

test("avant l'assaut : le rang est borné, et un rang invalide revient au début", () => {
  assert.equal(formationView(ctx(), 99).index, 8);
  assert.equal(formationView(ctx(), -3).index, 0);
  assert.equal(formationView(ctx(), NaN).index, 0);
  assert.equal(formationView(ctx(), 2.7).index, 2);
});

test("avant l'assaut : couleurs et format viennent des réglages", () => {
  const cfg = {
    ...DEFAULTS,
    colors: ["vert", ""],
    rounds: 2,
    roundSec: 120,
  };
  assert.equal(
    says(formationView(ctx({ cfg }), 0).step)[0],
    "Sont attendus sur l'aire… : en vert, … ; en …, …",
  );
  assert.equal(
    says(formationView(ctx({ cfg }), 3).step)[0],
    "À ma gauche, en vert, … ; à ma droite, en …, …",
  );
  assert.equal(
    says(formationView(ctx({ cfg }), 6).step)[1],
    "Pour un assaut en deux reprises de deux minutes, avec une minute de repos",
  );
});

test("les phrases d'usage sont marquées, celles du cahier non", () => {
  const usage = (i) => formationView(ctx(), i).step.phrases.map((p) => p.usage);
  assert.deepEqual(usage(0), [true], "appel");
  assert.deepEqual(usage(1), [true], "vérification du matériel");
  assert.deepEqual(usage(2), [false], "tireurs, au centre");
  assert.deepEqual(usage(3), [true], "présentation");
  assert.deepEqual(usage(4), [false, false, false], "salut");
  assert.deepEqual(usage(6), [false, true], "annonce du format");
  assert.deepEqual(usage(8), [false, false]);
});

test("en attente de la reprise suivante : « En garde », « Allez », puis « Stop »", () => {
  const v = formationView(ctx({ round: 2, started: true }), 5);
  assert.equal(v.sequence, null);
  assert.equal(v.index, 0, "hors séquence, le rang est ignoré");
  assert.equal(v.count, 1);
  assert.deepEqual(says(v.step), ["En garde", "Allez"]);
  assert.equal(v.step.note, "Le chrono attend « allez ».");
  assert.deepEqual(says(v.next), ["Stop"]);
});

test("pendant la reprise : « Stop », puis la fin de la reprise au « Temps »", () => {
  const v = formationView(ctx({ phase: "round", started: true }));
  assert.deepEqual(says(v.step), ["Stop"]);
  assert.equal(v.step.note, "Seul « stop » arrête l'assaut.");
  assert.deepEqual(says(v.next), ["Stop, fin de la reprise"]);
  assert.equal(v.next?.when, "Au « Temps » du chronométreur");
  const lastRound = formationView(
    ctx({ phase: "round", started: true, round: 3 }),
  );
  assert.deepEqual(says(lastRound.next), ["Stop, fin de l'assaut"]);
});

test("relais : le changement de tireur chaque minute est rappelé", () => {
  const v = formationView(
    ctx({
      phase: "round",
      started: true,
      cfg: { ...DEFAULTS, mode: "relais" },
    }),
  );
  assert.equal(
    v.step.note,
    "Seul « stop » arrête l'assaut. Chaque minute : « Tireurs, changez ou restez » (usage).",
  );
});

test("pendant un arrêt : sanction s'il y a lieu, puis « En garde », « Allez »", () => {
  const v = formationView(ctx({ phase: "round", halt: true, started: true }));
  assert.equal(v.step.when, "Arrêt");
  assert.deepEqual(says(v.step), ["En garde", "Allez"]);
  assert.match(v.step.note ?? "", /^Sanction s'il y a lieu/);
  assert.deepEqual(says(v.next), ["Stop, fin de la reprise"]);
});

test("temps dépassé : « Stop, fin de la reprise », ou « … de l'assaut » à la dernière", () => {
  const v = formationView(ctx({ phase: "overtime", started: true }));
  assert.deepEqual(says(v.step), ["Stop, fin de la reprise"]);
  assert.equal(
    v.step.note,
    "Le chrono lance la minute de repos à ce « stop ».",
  );
  assert.equal(v.next, null);
  const last = formationView(
    ctx({ phase: "overtime", started: true, round: 3 }),
  );
  assert.deepEqual(says(last.step), ["Stop, fin de l'assaut"]);
  assert.equal(last.step.note, "Le chrono termine l'assaut à ce « stop ».");
  const extra = formationView(
    ctx({ phase: "overtime", started: true, round: 4, totalRounds: 4 }),
  );
  assert.deepEqual(says(extra.step), ["Stop, fin de l'assaut"]);
});

test("« Temps » pendant un arrêt : finir, faire repartir, puis terminer (H.3.2.2)", () => {
  const v = formationView(
    ctx({ phase: "overtime", halt: true, started: true }),
  );
  assert.deepEqual(says(v.step), [
    "En garde",
    "Allez",
    "Stop, fin de la reprise",
  ]);
  assert.equal(v.next, null);
});

test("minute de repos : l'étape suit le temps restant, et annonce la suivante", () => {
  const at = (remaining, round = 1) =>
    formationView(ctx({ phase: "rest", started: true, remaining, round }));
  const start = at(60);
  assert.equal(start.step.when, "Repos");
  assert.deepEqual(says(start.step), []);
  assert.match(start.step.note ?? "", /Rien à dire avant 30 s/);
  assert.equal(start.next?.when, "À 30 s");
  assert.deepEqual(says(start.next), ["Tireurs, équipez-vous"]);
  assert.equal(at(30.05).step.when, "Repos", "pas avant 30 s");
  assert.equal(at(30).step.when, "30 s");
  assert.deepEqual(says(at(30).step), ["Tireurs, équipez-vous"]);
  assert.equal(at(15.05).step.when, "30 s");
  assert.equal(at(15.05).next?.when, "À 15 s");
  assert.deepEqual(says(at(15).step), [
    "Tireurs au centre",
    "Observations des juges : … (ou « Pas d'observation des juges »)",
  ]);
  assert.deepEqual(
    at(15).step.phrases.map((p) => p.usage),
    [false, true],
  );
  assert.equal(at(15).next?.when, "À 5 s");
  assert.deepEqual(says(at(15).next), [
    "Deuxième reprise",
    "Juge 1, prêt ? Juge 2, prêt ? Juge 3, prêt ?",
    "Chrono, prêt ?",
  ]);
  assert.equal(at(5).step.when, "5 s");
  assert.equal(at(5).next?.when, "Au « Temps » du chrono");
  assert.deepEqual(says(at(0).next), ["En garde", "Allez"]);
  assert.equal(says(at(5, 2).step)[0], "Troisième reprise");
  assert.equal(
    says(at(5, 3).step)[0],
    "Reprise supplémentaire",
    "après la dernière reprise prévue",
  );
});

test("repos arrêté : « Allez » le relance", () => {
  const v = formationView(
    ctx({ phase: "rest", halt: true, started: true, remaining: 40 }),
  );
  assert.deepEqual(says(v.step), ["Allez"]);
  assert.equal(v.next, null);
});

test("fin de l'assaut : salut, décompte, résultats, d'un toucher à l'autre", () => {
  const d = (i) => formationView(ctx({ phase: "done", started: true }), i);
  assert.equal(d(0).sequence, "resultats");
  assert.equal(d(0).count, 5);
  assert.deepEqual(says(d(0).step), [
    "Tireurs en place pour le salut",
    "Prêts pour le salut",
    "Saluez-vous",
  ]);
  assert.deepEqual(says(d(1).step), [], "les juges rendent leur décompte");
  assert.match(d(1).step.note ?? "", /collationne/);
  assert.deepEqual(says(d(2).step), ["Tireurs au centre, résultats"]);
  assert.match(says(d(3).step)[1], /est déclaré vainqueur/);
  assert.deepEqual(says(d(4).step), [
    "… les deux tireurs sont à égalité",
    "Reprise supplémentaire !",
    "Juges, décision",
  ]);
  assert.equal(d(4).next, null);
  assert.ok(
    d(4).step.phrases.every((p) => p.usage),
    "phrases d'usage",
  );
});

test("chaque étape a quelque chose à montrer", () => {
  const phases = /** @type {const} */ ([
    "ready",
    "round",
    "overtime",
    "rest",
    "done",
  ]);
  for (const phase of phases)
    for (const halt of [false, true])
      for (const started of [false, true])
        for (const remaining of [60, 20, 10, 2])
          for (let i = 0; i < 10; i++) {
            const v = formationView(
              ctx({ phase, halt, started, remaining }),
              i,
            );
            assert.ok(
              v.step.phrases.length > 0 || v.step.note,
              `${phase} ${halt} ${started} ${remaining} ${i}`,
            );
            assert.ok(v.step.when);
          }
});

test("repriseName : le nom de la reprise à venir", () => {
  assert.equal(repriseName(1, DEFAULTS), "Première reprise");
  assert.equal(repriseName(2, DEFAULTS), "Deuxième reprise");
  assert.equal(repriseName(4, { ...DEFAULTS, rounds: 4 }), "Quatrième reprise");
  assert.equal(repriseName(4, DEFAULTS), "Reprise supplémentaire");
});

test("le geste ou le détail accompagne les étapes qui en ont un", () => {
  const notes = (phase, n) =>
    Array.from(
      { length: n },
      (_, i) =>
        formationView(ctx({ phase, started: phase === "done" }), i).step.note,
    );
  assert.deepEqual(notes("ready", 9), [
    "Délégué officiel ou présentateur. Les tireurs vont à leur chaise.",
    "À la table du juge 1 : tenue, protections, 4 cannes, seconds.",
    "Casque sous le bras.",
    "Présentation, juste avant le salut.",
    undefined,
    "Les tireurs regagnent leur place et mettent le casque.",
    undefined,
    undefined,
    "Le chrono part à « allez ».",
  ]);
  assert.deepEqual(notes("done", 5), [
    "Puis les tireurs ôtent le casque à leur place.",
    "Les juges rendent leur décompte ; l'arbitre collationne touches, pénalités, avertissements et cartons.",
    "En tenue, sans casque ni canne, face au public.",
    "L'arbitre désigne le vainqueur du bras.",
    "Reprise supplémentaire ou décision des juges, selon le règlement de la compétition.",
  ]);
  assert.deepEqual(
    says(formationView(ctx({ phase: "done", started: true }), 3).step),
    [
      "Après décompte des points et des pénalités…",
      "… est déclaré vainqueur, à la majorité (ou à l'unanimité), le tireur …",
    ],
  );
  assert.equal(
    formationView(ctx({ round: 2, started: true })).next?.when,
    "Pour arrêter",
  );
  assert.equal(
    formationView(ctx({ phase: "overtime", halt: true, started: true })).step
      .note,
    "Finir le traitement de l'arrêt, puis faire repartir avant de terminer.",
  );
  assert.equal(
    formationView(ctx({ phase: "rest", halt: true, started: true })).step.note,
    "« Allez » relance la minute de repos.",
  );
});
