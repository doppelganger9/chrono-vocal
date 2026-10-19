// Écran titre et « Quoi de neuf » (js/intro.js) — #6, #84
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  shouldShowIntro,
  whatsNew,
  frenchDate,
  readSeen,
  markSeen,
  INTRO_KEY,
} from "../../js/intro.js";
import { VERSION } from "../../js/version.js";

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
};
const release = (version) => ({ version, date: "2026-10-19", sections: [] });

test("ordre des versions : chaque nombre compte, pas l'ordre alphabétique", () => {
  assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
  assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
  assert.ok(compareVersions("2.0.0", "1.9.9") > 0);
  assert.ok(compareVersions("1.1.1", "1.1.0") > 0);
  assert.ok(compareVersions("1.1.0", "1.1.2") < 0);
});

test("premier lancement : écran titre ; ensuite, une fois par nouvelle version", () => {
  assert.equal(shouldShowIntro(""), true);
  assert.equal(shouldShowIntro(VERSION), false);
  assert.equal(shouldShowIntro("1.1.0", "1.2.0"), true);
  assert.equal(shouldShowIntro("1.2.0", "1.2.0"), false);
  assert.equal(
    shouldShowIntro("1.3.0", "1.2.0"),
    false,
    "retour à une version plus ancienne",
  );
});

test("« Quoi de neuf » : les notes des versions plus récentes que la dernière vue", () => {
  const notes = ["1.3.0", "1.2.1", "1.2.0", "1.1.0"].map(release);
  assert.deepEqual(
    whatsNew("1.2.0", notes).map((n) => n.version),
    ["1.3.0", "1.2.1"],
  );
  assert.deepEqual(whatsNew("1.3.0", notes), []);
  assert.deepEqual(
    whatsNew("", notes),
    [],
    "premier lancement : pas de « quoi de neuf », c'est la présentation",
  );
  assert.deepEqual(whatsNew(VERSION), []);
});

test("date des notes en français", () => {
  assert.equal(frenchDate("2026-10-19"), "19 octobre 2026");
  assert.equal(frenchDate("2027-01-05"), "5 janvier 2027");
  assert.equal(frenchDate("2027-12-31"), "31 décembre 2027");
});

test("version vue : enregistrée, relue, et aucune si le stockage est indisponible", () => {
  const s = memory();
  assert.equal(readSeen(s), "");
  markSeen(s);
  assert.equal(s.m.get(INTRO_KEY), VERSION);
  assert.equal(readSeen(s), VERSION);
  assert.equal(
    readSeen({
      getItem() {
        throw new Error("bloqué");
      },
    }),
    "",
  );
  assert.doesNotThrow(() =>
    markSeen({
      setItem() {
        throw new Error("plein");
      },
    }),
  );
  assert.equal(readSeen(memory({ [INTRO_KEY]: "abc" })), "");
  assert.equal(readSeen(memory({ [INTRO_KEY]: "1.2" })), "");
  assert.equal(readSeen(memory({ [INTRO_KEY]: "x1.2.0" })), "");
  assert.equal(readSeen(memory({ [INTRO_KEY]: "1.2.0x" })), "");
});

test("ancienne valeur (numéro de présentation, avant #84) : vue avec la 1.0.0", () => {
  assert.equal(readSeen(memory({ [INTRO_KEY]: "2" })), "1.0.0");
  assert.equal(readSeen(memory({ [INTRO_KEY]: "2a" })), "");
  assert.equal(readSeen(memory({ [INTRO_KEY]: "a2" })), "");
});
