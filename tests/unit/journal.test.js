// Journal vocal (js/journal.js) et classement des phrases (js/lang.js classify) — #3
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createJournal, JOURNAL_KEY } from "../../js/journal.js";
import { classify } from "../../js/lang.js";

const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
};

test("classify : ce que l'app comprend d'une phrase, indépendamment de la phase", () => {
  const c = ["rouge", "bleu"];
  assert.deepEqual(classify("à les", {}, c), {
    kind: "command",
    cmd: "ALLEZ",
    enGarde: false,
    end: null,
  });
  assert.deepEqual(classify("Stop, fin de la reprise", {}, c), {
    kind: "command",
    cmd: "STOP",
    enGarde: false,
    end: "reprise",
  });
  assert.deepEqual(classify("en garde", {}, c), { kind: "engarde" });
  assert.deepEqual(classify("Chrono, prêt ?", {}, c), { kind: "ready" });
  assert.deepEqual(
    classify("Pénalité pour sortie d'aire, tireur bleu", {}, c),
    {
      kind: "motif",
      type: "penalite",
      pts: 1,
      detail: "sortie d'aire",
      color: "bleu",
    },
  );
  assert.deepEqual(classify("3 reprises de 2 minutes", {}, c), {
    kind: "referee",
    rounds: 3,
    roundSec: 120,
  });
  assert.deepEqual(classify("Allô", {}, c), { kind: "none" });
});

test("journal : chaque phrase entendue, avec ce que l'app en a fait, gardée sur le téléphone", () => {
  const s = memory();
  let t = 1000;
  const j = createJournal({ storage: s, now: () => t });
  j.setEnabled(true); // désactivé par défaut (#87)
  j.add({
    alts: ["à les", "allez"],
    final: true,
    phase: "ready",
    action: "ALLEZ",
  });
  t = 2000;
  j.add({ alts: ["Allô"], final: true, phase: "round", action: "non reconnu" });
  assert.equal(j.entries.length, 2);
  assert.deepEqual(j.entries[0], {
    t: 1000,
    alts: ["à les", "allez"],
    final: true,
    phase: "ready",
    action: "ALLEZ",
  });
  assert.equal(
    createJournal({ storage: s, now: () => t }).entries.length,
    2,
    "relu au prochain lancement",
  );
  j.clear();
  assert.equal(j.entries.length, 0);
  assert.equal(createJournal({ storage: s, now: () => t }).entries.length, 0);
});

test("journal : limité aux 500 dernières phrases, et sans risque si le stockage est indisponible", () => {
  const j = createJournal({ storage: memory(), now: () => 0, max: 3 });
  j.setEnabled(true);
  for (let i = 0; i < 5; i++)
    j.add({
      alts: [String(i)],
      final: true,
      phase: "ready",
      action: "non reconnu",
    });
  assert.deepEqual(
    j.entries.map((e) => e.alts[0]),
    ["2", "3", "4"],
  );
  const broken = {
    getItem() {
      throw new Error("bloqué");
    },
    setItem() {
      throw new Error("plein");
    },
  };
  const k = createJournal({ storage: broken, now: () => 0 });
  k.setEnabled(true);
  assert.doesNotThrow(() =>
    k.add({ alts: ["stop"], final: true, phase: "round", action: "STOP" }),
  );
  assert.equal(k.entries.length, 1);
});

test("journal : export en fichier", () => {
  const j = createJournal({ storage: memory(), now: () => 5 });
  j.setEnabled(true);
  j.add({ alts: ["stop"], final: true, phase: "round", action: "STOP" });
  const f = j.exportFile();
  assert.equal(f.name, "chrono-canne-journal-vocal.json");
  assert.deepEqual(JSON.parse(f.text), {
    app: "chrono-canne",
    journal: [
      { t: 5, alts: ["stop"], final: true, phase: "round", action: "STOP" },
    ],
  });
  assert.equal(JOURNAL_KEY, "chrono-canne-journal");
});

// Corpus de phrases réellement entendues (tests/corpus/*.json) : chaque phrase relue garde le sens attendu
for (const file of fs
  .readdirSync(new URL("../corpus/", import.meta.url))
  .filter((f) => f.endsWith(".json"))) {
  test(`corpus ${file}`, () => {
    const { colors = ["rouge", "bleu"], phrases } = JSON.parse(
      fs.readFileSync(new URL("../corpus/" + file, import.meta.url), "utf8"),
    );
    for (const p of phrases) {
      const got = classify(p.text, {}, colors);
      for (const [k, v] of Object.entries(p.expect))
        assert.deepEqual(got[k], v, `« ${p.text} » → ${k}`);
    }
  });
}
