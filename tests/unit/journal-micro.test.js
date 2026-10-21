// Événements du micro dans le journal vocal (#56)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createJournal } from "../../js/journal.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test("un événement du micro est noté avec son heure, son détail et la phase", () => {
  let t = 1000;
  const j = createJournal({ storage: memory(), now: () => t });
  j.event("error", "network", "round");
  assert.deepEqual(j.entries, [
    { t: 1000, event: "error", detail: "network", phase: "round" },
  ]);
  j.event("start");
  assert.deepEqual(j.entries[1], { t: 1000, event: "start" });
});

test("les relances ordinaires à la suite sont regroupées en une ligne, avec leur nombre", () => {
  let t = 0;
  const storage = memory();
  const j = createJournal({ storage, now: () => t });
  j.event("restart");
  t = 5000;
  j.event("restart");
  t = 9000;
  j.event("restart");
  assert.deepEqual(j.entries, [{ t: 0, event: "restart", n: 3, until: 9000 }]);
  assert.deepEqual(
    createJournal({ storage, now: () => t }).entries,
    j.entries,
    "le regroupement est enregistré",
  );
  j.setEnabled(true);
  j.add({ alts: ["Allez"], final: true, phase: "ready", action: "ALLEZ" });
  j.event("restart");
  assert.equal(j.entries.length, 3, "une phrase entre deux : nouvelle ligne");
  j.event("relisten", "Temps");
  j.event("relisten", "Temps");
  assert.equal(
    j.entries.length,
    5,
    "seules les relances ordinaires sont regroupées",
  );
});

test("les événements comptent dans la limite de taille du journal", () => {
  let t = 0;
  const j = createJournal({ storage: memory(), now: () => t++, max: 3 });
  j.event("start");
  j.event("error", "a");
  j.event("error", "b");
  j.event("error", "c");
  assert.deepEqual(
    j.entries.map((e) => e.detail),
    ["a", "b", "c"],
  );
});
