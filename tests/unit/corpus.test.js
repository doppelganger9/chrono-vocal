// Journal vocal exporté → fichier de corpus (#3), avec la version et le navigateur du journal (#112) :
// scripts/lib/corpus.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { classify } from "../../js/lang.js";
import { browserName } from "../../js/journal.js";

const require = createRequire(import.meta.url);
const { corpusFromJournal, versions } = require("../../scripts/lib/corpus.js");

const UA_S7 =
  "Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
const phrase = (text, extra = {}) => ({
  t: 1,
  alts: [text, "autre"],
  final: true,
  phase: "round",
  action: "?",
  ...extra,
});

test("corpus : version et navigateur du journal, en nom court (pas d'empreinte complète dans le dépôt public)", () => {
  const c = corpusFromJournal(
    {
      app: "chrono-canne",
      version: "1.8.0",
      exported: "2026-10-24T18:30:00.000Z",
      userAgent: UA_S7,
      journal: [
        { t: 0, event: "start", v: "1.7.0" },
        phrase("Stop"),
        { t: 2, event: "start", v: "1.8.0" },
      ],
    },
    "journal-s7.json",
    { classify, browserName },
  );
  assert.equal(c.version, "1.7.0, 1.8.0");
  assert.equal(c.navigateur, "Samsung Internet");
  assert.equal(c.exporte, "2026-10-24T18:30:00.000Z");
  assert.match(c.source, /^Journal vocal journal-s7\.json \(/);
  assert.match(c.source, /version 1\.7\.0, 1\.8\.0/);
  assert.match(c.source, /Samsung Internet/);
  assert.ok(!JSON.stringify(c).includes("SM-G930F"));
  assert.deepEqual(Object.keys(c).slice(0, 5), [
    "source",
    "version",
    "navigateur",
    "exporte",
    "colors",
  ]);
});

test("corpus : journal d'avant #112, sans version ni navigateur", () => {
  const c = corpusFromJournal(
    { app: "chrono-canne", journal: [phrase("Stop")] },
    "vieux.json",
    { classify, browserName },
  );
  assert.equal(c.version, "inconnue");
  assert.equal(c.navigateur, "inconnu");
  assert.equal(c.exporte, undefined);
  assert.match(c.source, /version inconnue, navigateur inconnu/);
  assert.equal(c.phrases.length, 1);
});

test("corpus : sans « start » noté, la version de l'export", () => {
  const c = corpusFromJournal(
    { version: "1.7.0", journal: [phrase("Stop")] },
    "j.json",
    { classify, browserName },
  );
  assert.equal(c.version, "1.7.0");
});

test("versions : les versions vues, dans l'ordre, sans doublon ni valeur hostile", () => {
  assert.deepEqual(
    versions({
      version: "1.8.0",
      journal: [
        { event: "start", v: "1.7.0" },
        { event: "start", v: "1.7.0" },
        { event: "start", v: 3 },
        { event: "start" },
        null,
        { event: "start", v: "1.8.0" },
      ],
    }),
    ["1.7.0", "1.8.0"],
  );
  assert.deepEqual(versions({ version: "1.8.0", journal: [] }), ["1.8.0"]);
  assert.deepEqual(versions({ version: 2, journal: "x" }), []);
  assert.deepEqual(versions({}), []);
});

test("corpus : phrases reconnues, à relire, et filtres (courtes, finales, sans doublon)", () => {
  const c = corpusFromJournal(
    {
      journal: [
        phrase("Stop"),
        phrase("stop"), // doublon
        phrase("Allô"),
        phrase("Allez", { final: false }),
        phrase("   "),
        phrase(
          "un deux trois quatre cinq six sept huit neuf dix onze douze treize",
        ),
        { t: 3, event: "error", detail: "no-speech" },
      ],
    },
    "j.json",
    { classify, browserName },
  );
  assert.deepEqual(c.colors, ["rouge", "bleu"]);
  assert.deepEqual(c.phrases, [
    { text: "Stop", expect: { kind: "command", cmd: "STOP", end: null } },
  ]);
  assert.deepEqual(c.a_relire, [
    { text: "Allô", alternatives: ["autre"], phase: "round" },
  ]);
});

test("corpus : ce qui est gardé de chaque sens, selon la sorte de phrase", () => {
  const c = corpusFromJournal(
    {
      journal: [
        phrase("Pénalité pour sortie d'aire, tireur bleu"),
        phrase("Trois reprises de deux minutes"),
        phrase("en garde"),
        phrase("un  deux\ttrois quatre cinq six sept huit neuf dix onze douze"), // 12 mots : gardée
      ],
    },
    "j.json",
    { classify, browserName },
  );
  assert.deepEqual(c.phrases.slice(0, 3), [
    {
      text: "Pénalité pour sortie d'aire, tireur bleu",
      expect: { kind: "motif", type: "penalite", color: "bleu" },
    },
    {
      text: "Trois reprises de deux minutes",
      expect: { kind: "referee", rounds: 3, roundSec: 120 },
    },
    { text: "en garde", expect: { kind: "engarde" } },
  ]);
  assert.equal(c.phrases.length + c.a_relire.length, 4);
});

test("corpus : fichier hostile ou abîmé, sans planter", () => {
  for (const data of [
    null,
    42,
    "x",
    { journal: "x" },
    { journal: [null, {}, { final: true }, { final: true, alts: "x" }] },
  ]) {
    const c = corpusFromJournal(data, "j.json", { classify, browserName });
    assert.deepEqual([c.phrases, c.a_relire], [[], []]);
    assert.equal(c.version, "inconnue");
    assert.equal(c.navigateur, "inconnu");
  }
  const c = corpusFromJournal(
    { exported: 5, userAgent: 3, journal: [] },
    "j.json",
    { classify, browserName },
  );
  assert.equal(c.exporte, undefined);
  assert.equal(c.navigateur, "inconnu");
  assert.deepEqual(versions(null), []);
});
