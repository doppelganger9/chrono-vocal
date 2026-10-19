// Réglages venus de l'extérieur (lien ou fichier partagé, stockage du navigateur) : valeurs hostiles (#55)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, migrate } from "../../js/settings.js";
import { decodeSettings } from "../../js/transfer.js";

const HTML = "<img src=x onerror=alert(1)>";

test("types faux : chaque réglage invalide reprend sa valeur par défaut", () => {
  const c = migrate({
    v: 5,
    mode: "boxe",
    preset: 42,
    rounds: "3",
    roundSec: "abc",
    restSec: -5,
    extraMax: 9,
    extraSec: null,
    relayBase: {},
    relayCount: 99,
    countStops: "oui",
    prolong: "toujours",
    requireEnGarde: 1,
    autoRest: [],
    answerReady: "non",
    theme: "rose",
    board: "true",
  });
  for (const k of [
    "mode",
    "preset",
    "roundSec",
    "restSec",
    "extraMax",
    "relayBase",
    "relayCount",
    "countStops",
    "prolong",
    "requireEnGarde",
    "autoRest",
    "answerReady",
    "theme",
    "board",
  ])
    assert.deepEqual(c[k], DEFAULTS[k], k);
  assert.equal(
    c.rounds,
    DEFAULTS.rounds,
    "un nombre écrit en texte n'est pas un nombre",
  );
});

test("bornes : nombre de reprises, durées, nombre d'équipiers", () => {
  assert.equal(migrate({ rounds: 0 }).rounds, 1);
  assert.equal(migrate({ rounds: 12 }).rounds, 4);
  assert.equal(
    migrate({ rounds: 2.5 }).rounds,
    DEFAULTS.rounds,
    "pas un entier",
  );
  assert.equal(migrate({ roundSec: 0 }).roundSec, DEFAULTS.roundSec);
  assert.equal(migrate({ roundSec: 1e9 }).roundSec, DEFAULTS.roundSec);
  assert.equal(migrate({ roundSec: 120 }).roundSec, 120);
  assert.equal(
    migrate({ mode: "relais", relayBase: 90, relayCount: 5, roundSec: 900 })
      .roundSec,
    900,
    "relais : reprise unique longue",
  );
  assert.equal(migrate({ restSec: 0 }).restSec, 0);
  assert.equal(migrate({ restSec: 601 }).restSec, DEFAULTS.restSec);
  assert.equal(migrate({ relayCount: 1 }).relayCount, DEFAULTS.relayCount);
  assert.equal(migrate({ extraMax: 2 }).extraMax, 2);
  assert.equal(migrate({ roundSec: Infinity }).roundSec, DEFAULTS.roundSec);
  assert.equal(migrate({ roundSec: NaN }).roundSec, DEFAULTS.roundSec);
});

test("couleurs des tireurs : des lettres seulement, sinon la couleur par défaut", () => {
  assert.deepEqual(migrate({ colors: ["vert", "noir"] }).colors, [
    "vert",
    "noir",
  ]);
  assert.deepEqual(migrate({ colors: ["bleu-ciel", "rouge d'or"] }).colors, [
    "bleu-ciel",
    "rouge d'or",
  ]);
  assert.deepEqual(
    migrate({ colors: ["Écarlate", ""] }).colors,
    ["Écarlate", ""],
    "accents ; une couleur vide est permise",
  );
  assert.deepEqual(migrate({ colors: [HTML, "bleu("] }).colors, [
    "rouge",
    "bleu",
  ]);
  assert.deepEqual(
    migrate({ colors: ["a".repeat(21), "bleu"] }).colors,
    ["rouge", "bleu"],
    "20 caractères au plus",
  );
  assert.deepEqual(migrate({ colors: "rouge" }).colors, DEFAULTS.colors);
  assert.deepEqual(
    migrate({ colors: ["vert"] }).colors,
    ["vert", "bleu"],
    "il faut deux couleurs",
  );
  assert.deepEqual(
    migrate({ colors: [1, "bleu", "jaune"] }).colors,
    ["rouge", "bleu"],
    "deux, pas plus",
  );
});

test("annonces du repos : entiers de 1 à 600 s, 10 au plus, les autres écartés", () => {
  assert.deepEqual(migrate({ calls: [30, 15, 5] }).calls, [30, 15, 5]);
  assert.deepEqual(
    migrate({ calls: [30, "x", -1, 2.5, 1e6, 15] }).calls,
    [30, 15],
  );
  assert.deepEqual(migrate({ calls: "trente" }).calls, DEFAULTS.calls);
  assert.equal(
    migrate({ calls: Array.from({ length: 50 }, (_, i) => i + 1) }).calls
      .length,
    10,
  );
});

test("mots appris : seulement les trois commandes, des mots courts en lettres et chiffres", () => {
  const c = migrate({
    learned: {
      ALLEZ: ["alo", HTML, "x".repeat(31), 3],
      STOP: "stop",
      PIRATE: ["a"],
      __proto__: { x: 1 },
    },
  });
  assert.deepEqual(c.learned, { STOP: [], ALLEZ: ["alo"], REPOS: [] });
});

test("palette : couleurs #rrggbb pour les clés connues seulement", () => {
  assert.deepEqual(
    migrate({
      palette: {
        round: "#ff0000",
        rest: "red",
        stop: "#12345",
        over: `#123456;background:url(x)`,
        autre: "#000000",
      },
    }).palette,
    { round: "#ff0000" },
  );
  assert.deepEqual(migrate({ palette: "x" }).palette, {});
});

test("les clés inconnues sont écartées", () => {
  const c = migrate({ pirate: HTML, constructor: 1 });
  assert.equal(Object.hasOwn(c, "pirate"), false);
  assert.deepEqual(Object.keys(c).sort(), Object.keys(DEFAULTS).sort());
});

test("un lien partagé hostile donne des réglages sûrs", () => {
  const evil = {
    app: "chrono-canne",
    cfg: {
      v: 5,
      colors: [HTML, "bleu"],
      rounds: "beaucoup",
      learned: { ALLEZ: [HTML] },
    },
  };
  const r = decodeSettings(JSON.stringify(evil));
  assert.equal(r.ok, true);
  assert.deepEqual(r.cfg.colors, ["rouge", "bleu"]);
  assert.equal(r.cfg.rounds, DEFAULTS.rounds);
  assert.deepEqual(r.cfg.learned.ALLEZ, []);
  assert.equal(
    decodeSettings(JSON.stringify({ app: "chrono-canne", cfg: { v: "99" } }))
      .ok,
    true,
    "version en texte : ignorée, pas un plantage",
  );
});

test("les valeurs valides sont toutes gardées, y compris celles qui ne sont pas par défaut", () => {
  for (const mode of ["assaut", "relais"])
    assert.equal(migrate({ mode }).mode, mode);
  for (const prolong of ["off", "propose", "auto"])
    assert.equal(migrate({ prolong }).prolong, prolong);
  for (const theme of ["auto", "jour", "nuit"])
    assert.equal(migrate({ theme }).theme, theme);
  assert.equal(migrate({ preset: "sen" }).preset, "sen");
  for (const k of [
    "countStops",
    "requireEnGarde",
    "autoRest",
    "answerReady",
    "board",
  ]) {
    assert.equal(migrate({ [k]: true })[k], true, k);
    assert.equal(migrate({ [k]: false })[k], false, k);
  }
  assert.deepEqual(
    migrate({ calls: [600, 1] }).calls,
    [600, 1],
    "bornes comprises",
  );
  assert.deepEqual(migrate({ calls: [601, 0] }).calls, []);
  const palette = {
    round: "#AABBCC",
    rest: "#000000",
    stop: "#ffffff",
    over: "#123abc",
  };
  assert.deepEqual(migrate({ palette }).palette, palette);
  assert.deepEqual(migrate({ palette: { round: "x#123456" } }).palette, {});
  assert.deepEqual(
    migrate({ palette: { round: ["#123456"] } }).palette,
    {},
    "un tableau n'est pas une couleur",
  );
});

test("des réglages qui ne sont pas un objet donnent les réglages par défaut", () => {
  for (const saved of [null, [1, 2], "réglages", 42])
    assert.deepEqual(
      migrate(/** @type {any} */ (saved)),
      migrate({}),
      String(saved),
    );
  assert.deepEqual(
    migrate({ learned: [["alo"]], palette: ["#000000"] }).learned,
    { STOP: [], ALLEZ: [], REPOS: [] },
  );
  assert.deepEqual(migrate({ palette: ["#000000"] }).palette, {});
});

test("anciennes versions : migrations conservées", () => {
  assert.deepEqual(migrate({ v: 2, colors: ["jaune", "bleu"] }).colors, [
    "rouge",
    "bleu",
  ]);
  assert.deepEqual(migrate({ v: 1, calls: [15, 10, 5] }).calls, [30, 15, 5]);
  assert.equal(migrate({ prolong: true }).prolong, "propose");
  assert.equal(migrate({ prolong: false }).prolong, "off");
});
