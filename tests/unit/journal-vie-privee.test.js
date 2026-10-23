// Journal vocal et vie privée (#87) : désactivé par défaut, phrases gardées 7 jours au plus
import { test } from "node:test";
import { VERSION } from "../../js/version.js"; // chaque start note la version (#112)
import assert from "node:assert/strict";
import {
  createJournal,
  JOURNAL_KEY,
  JOURNAL_ON_KEY,
  JOURNAL_DAYS,
  EXPORT_WARNING,
} from "../../js/journal.js";

const DAY = 24 * 3600 * 1000;
const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
};
const phrase = { alts: ["stop"], final: true, phase: "round", action: "STOP" };

test("désactivé par défaut : aucune phrase notée, les événements du micro le restent", () => {
  const s = memory();
  const j = createJournal({ storage: s, now: () => 0 });
  assert.equal(j.enabled, false);
  j.add(phrase);
  j.event("start");
  assert.deepEqual(j.entries, [{ t: 0, event: "start", v: VERSION }]);
});

test("activé à la main, gardé au prochain lancement, puis désactivé", () => {
  const s = memory();
  const j = createJournal({ storage: s, now: () => 0 });
  j.setEnabled(true);
  assert.equal(s.m.get(JOURNAL_ON_KEY), "1");
  j.add(phrase);
  assert.equal(j.entries.length, 1);
  const k = createJournal({ storage: s, now: () => 0 });
  assert.equal(k.enabled, true);
  k.setEnabled(false);
  assert.equal(createJournal({ storage: s, now: () => 0 }).enabled, false);
  k.add(phrase);
  assert.equal(k.entries.length, 1, "plus rien de noté une fois désactivé");
});

test("réglage enregistré hostile : désactivé", () => {
  for (const v of ["true", "oui", "<b>1</b>", "", "0"])
    assert.equal(
      createJournal({ storage: memory({ [JOURNAL_ON_KEY]: v }) }).enabled,
      false,
      v,
    );
});

test(`les entrées de plus de ${JOURNAL_DAYS} jours sont effacées à l'ouverture`, () => {
  assert.equal(JOURNAL_DAYS, 7);
  const now = 100 * DAY;
  const old = [
    { t: now - 7 * DAY - 1, ...phrase },
    { t: now - 8 * DAY, event: "start" },
    { t: now - 7 * DAY, ...phrase },
    { t: now - 1, event: "stop" },
  ];
  const s = memory({ [JOURNAL_KEY]: JSON.stringify(old) });
  const j = createJournal({ storage: s, now: () => now });
  assert.deepEqual(
    j.entries.map((e) => e.t),
    [now - 7 * DAY, now - 1],
  );
  assert.equal(
    JSON.parse(s.m.get(JOURNAL_KEY)).length,
    2,
    "effacées aussi du téléphone",
  );
});

test("migration : un journal existant est gardé, le réglage part désactivé", () => {
  const s = memory({ [JOURNAL_KEY]: JSON.stringify([{ t: 5, ...phrase }]) });
  const j = createJournal({ storage: s, now: () => 10 });
  assert.equal(j.enabled, false);
  assert.equal(j.entries.length, 1);
});

test("journal enregistré hostile : seules les entrées datées sont gardées", () => {
  for (const v of ['{"t":1}', "42", "null", '[1,null,{"t":"x"}]', "{"])
    assert.deepEqual(
      createJournal({ storage: memory({ [JOURNAL_KEY]: v }), now: () => 1 })
        .entries,
      [],
      v,
    );
});

test("avertissement à l'export", () => {
  assert.equal(
    EXPORT_WARNING,
    "Le journal peut contenir des conversations entendues autour de l'aire : relisez-le avant de le partager.",
  );
});

test("clé du réglage, stockage indisponible et horloge par défaut", () => {
  assert.equal(JOURNAL_ON_KEY, "chrono-canne-journal-on");
  const broken = {
    getItem() {
      throw new Error("bloqué");
    },
    setItem() {},
  };
  assert.equal(createJournal({ storage: broken }).enabled, false);
  const recent = [{ t: Date.now() - 1000, event: "start" }];
  assert.equal(
    createJournal({
      storage: memory({ [JOURNAL_KEY]: JSON.stringify(recent) }),
    }).entries.length,
    1,
    "l'heure du téléphone par défaut",
  );
});
