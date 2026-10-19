// Réglages : valeurs par défaut, migrations des anciennes versions, stockage (js/settings.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  migrate,
  load,
  save,
  normalizeConfig,
  PRESETS,
} from "../../js/settings.js";

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
};

test("sans réglage enregistré : les valeurs par défaut", () => {
  const c = load(memory());
  assert.equal(c.rounds, 3);
  assert.equal(c.roundSec, 90);
  assert.deepEqual(c.calls, [30, 15, 5]);
  assert.deepEqual(c.colors, ["rouge", "bleu"]);
  assert.equal(c.prolong, "propose");
  assert.equal(c.v, DEFAULTS.v);
});

test("stockage illisible ou indisponible : l'app démarre quand même", () => {
  assert.equal(load(memory({ "chrono-canne": "{pas du json" })).rounds, 3);
  assert.equal(
    load({
      getItem() {
        throw new Error("bloqué");
      },
    }).rounds,
    3,
  );
  assert.doesNotThrow(() =>
    save(
      {
        setItem() {
          throw new Error("plein");
        },
      },
      DEFAULTS,
    ),
  );
});

test("migrations : annonces 30/15/5, couleurs rouge/bleu, prolongation proposée, 4 reprises au plus", () => {
  const c = migrate({
    rounds: 5,
    roundSec: 120,
    calls: [15, 10, 5],
    colors: ["jaune", "bleu"],
    prolong: true,
  });
  assert.equal(c.rounds, 4);
  assert.deepEqual(c.calls, [30, 15, 5]);
  assert.deepEqual(c.colors, ["rouge", "bleu"]);
  assert.equal(c.prolong, "propose");
  assert.equal(migrate({ prolong: false }).prolong, "off");
  assert.equal(c.v, DEFAULTS.v);
});

test("migrations : ne touchent pas aux choix récents ou personnalisés", () => {
  const c = migrate({ v: 3, calls: [15, 10, 5], colors: ["jaune", "bleu"] });
  assert.deepEqual(c.calls, [15, 10, 5]);
  assert.deepEqual(c.colors, ["jaune", "bleu"]);
  assert.deepEqual(migrate({ calls: [20, 10] }).calls, [20, 10]);
  assert.deepEqual(migrate({ colors: ["vert", "bleu"] }).colors, [
    "vert",
    "bleu",
  ]);
});

test("les variantes apprises sont fusionnées avec la structure par défaut", () => {
  assert.deepEqual(migrate({ learned: { ALLEZ: ["alo"] } }).learned, {
    STOP: [],
    ALLEZ: ["alo"],
    REPOS: [],
  });
});

test("en assaut, une reprise supplémentaire dure comme les autres ; en relais, elle garde sa durée", () => {
  assert.equal(
    normalizeConfig({ ...DEFAULTS, roundSec: 120, extraSec: 30 }).extraSec,
    120,
  );
  assert.equal(
    normalizeConfig({
      ...DEFAULTS,
      mode: "relais",
      roundSec: 360,
      extraSec: 180,
    }).extraSec,
    180,
  );
  assert.equal(migrate({ roundSec: 120 }).extraSec, 120);
  assert.equal(normalizeConfig({ ...DEFAULTS, rounds: 0 }).rounds, 1);
});

test("enregistrer puis relire redonne les mêmes réglages", () => {
  const s = memory();
  save(s, { ...DEFAULTS, rounds: 4, roundSec: 120 });
  const c = load(s);
  assert.equal(c.rounds, 4);
  assert.equal(c.roundSec, 120);
});

test("préréglages : maximums des compétitions nationales", () => {
  const p = Object.fromEntries(PRESETS.map((x) => [x.id, x]));
  assert.deepEqual(
    [p.senf.rounds, p.senf.roundSec, p.senf.extraMax],
    [4, 120, 1],
  );
  assert.deepEqual([p.m9.rounds, p.m9.roundSec, p.m9.extraMax], [2, 90, 0]);
  assert.equal(p.custom.rounds, undefined);
});

// ---------- Cas ajoutés d'après les tests de mutation ----------

test("valeurs par défaut exactes (ce que voit un nouveau téléphone)", () => {
  assert.deepEqual(DEFAULTS, {
    v: 5,
    mode: "assaut",
    preset: "custom",
    rounds: 3,
    roundSec: 90,
    restSec: 60,
    extraMax: 1,
    extraSec: 90,
    relayBase: 90,
    relayCount: 3,
    countStops: true,
    prolong: "propose",
    requireEnGarde: false,
    autoRest: false,
    calls: [30, 15, 5],
    colors: ["rouge", "bleu"],
    answerReady: true,
    learned: { STOP: [], ALLEZ: [], REPOS: [] },
    theme: "auto",
    palette: {},
    board: false,
  });
});

test("la clé de stockage ne change pas : les téléphones gardent leurs réglages", () => {
  const s = memory({ "chrono-canne": JSON.stringify({ v: 4, rounds: 2 }) });
  assert.equal(load(s).rounds, 2);
  save(s, { ...DEFAULTS, rounds: 4 });
  assert.equal(JSON.parse(s.m.get("chrono-canne")).rounds, 4);
});

test("les migrations ne s'appliquent qu'aux versions concernées", () => {
  assert.deepEqual(migrate({ v: 1, calls: [15, 10, 5] }).calls, [30, 15, 5]);
  assert.deepEqual(migrate({ v: 2, calls: [15, 10, 5] }).calls, [15, 10, 5]);
  assert.deepEqual(migrate({ v: 2, colors: ["jaune", "bleu"] }).colors, [
    "rouge",
    "bleu",
  ]);
});

test("préréglages : la liste complète affichée dans les réglages", () => {
  assert.deepEqual(
    PRESETS.map((p) => [p.id, p.label, p.rounds, p.roundSec, p.extraMax]),
    [
      ["custom", "Personnalisé", undefined, undefined, undefined],
      ["m9", "Moins de 9 ans — 2 × 1'30\"", 2, 90, 0],
      ["m12", "Moins de 12 ans — 2 × 1'30\"", 2, 90, 1],
      ["m15cdf", "Moins de 15 ans, Ch. de France — 2 × 1'30\"", 2, 90, 1],
      ["m15", "Moins de 15 ans, Challenge Jeunes — 3 × 1'30\"", 3, 90, 1],
      ["m18", "Moins de 18 ans — 3 × 1'30\"", 3, 90, 1],
      ["sen", "Seniors, phases 1 et 2 — 3 × 2'", 3, 120, 1],
      ["senf", "Seniors, finales — 4 × 2'", 4, 120, 1],
      ["vet", "Vétérans, phases 1 et 2 — 3 × 1'30\"", 3, 90, 1],
      ["vetf", "Vétérans, finales — 4 × 1'30\"", 4, 90, 1],
    ],
  );
});

test("apparence : thème automatique et palette d'origine par défaut ; palette personnalisée conservée", () => {
  const c = migrate({ v: 4, rounds: 2 });
  assert.equal(c.theme, "auto");
  assert.deepEqual(c.palette, {});
  assert.deepEqual(
    migrate({ theme: "jour", palette: { round: "#123456" } }).palette,
    { round: "#123456" },
  );
});
