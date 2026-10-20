// Android (Samsung S7) : chaque morceau d'une phrase arrive comme phrase finie, avec un nouvel index (#110).
// Les suites de phrase sont tirées du journal vocal exporté par David le 20 octobre 2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceSetup } from "./voice-helpers.js";

/** l'assaut commencé et arrêté, une nouvelle écoute : prêt pour une sanction */
function arrete() {
  const v = voiceSetup({ requireEnGarde: false });
  v.hear("Allez");
  v.hear("Stop");
  v.voice.onRestart();
  v.h.advance(5000);
  return v;
}
/** chaque morceau arrive fini, à 200 ms d'intervalle */
const morceaux = (v, texts) =>
  texts.forEach((t) => {
    v.hear(t);
    v.h.clock.t += 200;
  });

test("une sanction qui s'allonge est notée une seule fois, corrigée à chaque morceau", () => {
  const v = arrete();
  morceaux(v, [
    "pénalité",
    "pénalité tir",
    "pénalité tir en bleu",
    "pénalité tir en bleu pour",
    "pénalité tir en bleu pour lâcher",
    "pénalité tir en bleu pour lâcher de canne",
  ]);
  assert.equal(v.h.bout.events.length, 1, "une seule pénalité");
  const [ev] = v.h.bout.events;
  assert.equal(ev.type, "penalite");
  assert.equal(ev.color, "bleu");
  assert.equal(ev.detail, "lâcher de canne");
  assert.equal(ev.round, 1);
  assert.equal(ev.stop, 0, "toujours rattachée à l'arrêt");
  assert.equal(
    v.done.filter((d) => d === "PÉNALITÉ").length,
    1,
    "« Annuler » l'enlève d'un coup",
  );
  assert.equal(v.last(), "📝 Pénalité (lâcher de canne) bleu");
  assert.deepEqual(
    v.journal.slice(-6).map((e) => e.action),
    [
      "sanction : Pénalité",
      "sanction corrigée : Pénalité",
      "sanction corrigée : Pénalité bleu",
      "sanction corrigée : Pénalité bleu",
      "sanction corrigée : Pénalité bleu",
      "sanction corrigée : Pénalité (lâcher de canne) bleu",
    ],
    "le journal garde chaque morceau",
  );
});

test("la sanction corrigée garde l'heure où elle a été dite", () => {
  const v = arrete();
  const t = v.h.clock.wall();
  morceaux(v, ["observation", "observation tireur rouge"]);
  assert.equal(v.h.bout.events.length, 1);
  assert.equal(v.h.bout.events[0].t, t);
  assert.equal(v.h.bout.events[0].color, "rouge");
});

test("une phrase complète qui n'est plus une sanction retire la sanction notée", () => {
  const v = arrete();
  // aujourd'hui, une phrase qui commence par « observation » est une sanction, sauf si c'est un rappel ;
  // « observation des juges » s'y ajoutera (#109)
  morceaux(v, ["observation", "observation rappel tireur bleu"]);
  assert.equal(v.h.bout.events.length, 0);
  assert.deepEqual(v.rappels, ["bleu"], "la phrase complète a servi");
  assert.ok(v.heard.includes("↶ Observation retirée"));
  assert.equal(v.journal.at(-1).action, "sanction retirée, rappel bleu");
});

test("deux sanctions qui se suivent sans se prolonger sont deux sanctions", () => {
  const v = arrete();
  morceaux(v, ["observation rouge", "pénalité bleu"]);
  assert.equal(v.h.bout.events.length, 2);
});

test("au-delà de 3 s ou après une nouvelle écoute, la même phrase est une nouvelle phrase", () => {
  const v = arrete();
  v.hear("observation rouge");
  v.h.clock.t += 3000;
  v.hear("observation rouge bleu");
  assert.equal(v.h.bout.events.length, 2, "3 s après : une autre sanction");
  v.voice.onRestart();
  v.hear("observation rouge bleu");
  assert.equal(v.h.bout.events.length, 3, "nouvelle écoute");
});

test("une sanction annulée entre deux morceaux : la suite est notée à nouveau", () => {
  const v = arrete();
  v.hear("observation");
  v.h.chrono.restore(snapshotSans(v));
  v.hear("observation tireur rouge");
  assert.equal(v.h.bout.events.length, 1);
  assert.equal(v.journal.at(-1).action, "sanction : Observation rouge");
});
/** l'état d'avant la sanction, comme après « Annuler » */
function snapshotSans(v) {
  const s = v.h.chrono.snapshot();
  s.bout.events = [];
  return s;
}

test("la même phrase répétée telle quelle ne refait rien, sans « sans effet »", () => {
  const v = arrete();
  v.hear("Allez");
  morceaux(v, ["stoppe", "stoppe"]);
  assert.equal(v.done.filter((d) => d === "STOP").length, 2, "un seul STOP");
  assert.equal(v.journal.at(-1).action, "répétition ignorée");
  assert.ok(!v.heard.some((h) => h.includes("sans effet")));
  morceaux(v, ["pénalité bleu", "pénalité bleu"]);
  assert.equal(v.h.bout.events.length, 1);
});

test("un commandement prolongé par le même commandement ne refait rien", () => {
  const v = arrete();
  morceaux(v, ["allez", "allez-y"]);
  assert.equal(v.done.filter((d) => d === "ALLEZ").length, 2);
  assert.equal(v.journal.at(-1).action, "répétition ignorée");
});

test("« en garde » puis « en garde allez » : ALLEZ ; « stop » puis « stop, fin de la reprise » : fin de la reprise", () => {
  const v = voiceSetup();
  morceaux(v, ["en", "en garde", "en garde allez"]);
  assert.equal(v.h.st.phase, "round");
  assert.equal(v.journal.at(-1).action, "ALLEZ");
  v.h.advance(5000);
  morceaux(v, ["stoppe", "stoppe fin de la reprise"]);
  assert.equal(v.h.st.phase, "rest");
  assert.equal(v.journal.at(-1).action, "FIN DE REPRISE");
});

test("les débuts de phrase prolongés ne restent pas dans les mots à apprendre", () => {
  const v = arrete();
  morceaux(v, ["tireur", "tireur bleu", "tireur bleu défaut"]);
  assert.deepEqual(v.voice.unheard, ["tireur bleu défaut"]);
  v.hear("second");
  assert.deepEqual(v.voice.unheard, ["second", "tireur bleu défaut"]);
});

test("une phrase non comprise, redite telle quelle, est relue : un mot appris entre-temps la fait comprendre", () => {
  const v = voiceSetup();
  v.hear("Hop");
  v.voice.learn(0, "ALLEZ");
  v.hear("Hop");
  assert.equal(v.h.st.phase, "round");
});

test("iPhone : les résultats provisoires ne comptent pas, seule la phrase finie agit", () => {
  const v = arrete();
  v.hearSame(
    ["observation", "observation tireur", "observation tireur rouge"],
    [false, false, true],
  );
  assert.equal(v.h.bout.events.length, 1);
  assert.equal(v.journal.at(-1).action, "sanction : Observation rouge");
});
