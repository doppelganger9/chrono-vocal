// « Fin de l'assaut » : l'arbitre termine l'assaut à tout moment (#77). Le chrono suit (ADR 0006)
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./helpers.js";

test("pendant une reprise, avant la dernière : l'assaut se termine", () => {
  const h = setup({ roundSec: 60, rounds: 3 });
  h.chrono.allez();
  h.advance(20_000);
  h.chrono.stop();
  assert.equal(h.chrono.endBout(), true);
  assert.equal(h.st.phase, "done");
  assert.equal(h.st.running, false);
  assert.equal(h.st.halt, false);
  assert.equal(h.events.at(-1).type, "finish");
  assert.ok(h.bout.end);
  assert.ok(h.bout.rounds[1].end, "la reprise en cours est close");
  assert.ok(h.bout.stops[0].dur !== null, "l'arrêt en cours est clos");
  assert.equal(h.chrono.allez(), false);
});

test("en temps supplémentaire : le dépassement est enregistré", () => {
  const h = setup({ roundSec: 10, rounds: 3 });
  h.chrono.allez();
  h.advance(14_000);
  assert.equal(h.st.phase, "overtime");
  assert.equal(h.chrono.endBout(), true);
  assert.equal(h.st.phase, "done");
  assert.ok(Math.abs(h.bout.rounds[1].over - 4) < 0.11);
});

test("pendant la minute de repos, ou en attente de la reprise suivante", () => {
  const h = setup({ roundSec: 10, rounds: 3, restSec: 60 });
  h.chrono.allez();
  h.advance(11_000);
  h.chrono.endReprise();
  assert.equal(h.st.phase, "rest");
  h.advance(5000);
  assert.equal(h.chrono.endBout(), true);
  assert.equal(h.st.phase, "done");
  assert.equal(h.events.at(-1).type, "finish");

  const r = setup({ roundSec: 10, rounds: 3, restSec: 60 });
  r.chrono.allez();
  r.advance(11_000);
  r.chrono.endReprise();
  r.advance(61_000);
  assert.equal(r.st.phase, "ready");
  assert.equal(r.st.round, 2);
  assert.equal(r.chrono.endBout(), true);
  assert.equal(r.st.phase, "done");
});

test("sans effet avant la première reprise, et une fois l'assaut fini", () => {
  const h = setup({ roundSec: 10, rounds: 1 });
  assert.equal(h.chrono.endBout(), false);
  assert.equal(h.st.phase, "ready");
  h.chrono.allez();
  h.advance(3000);
  assert.equal(h.chrono.endBout(), true);
  const n = h.events.length;
  assert.equal(h.chrono.endBout(), false);
  assert.equal(h.events.length, n, "pas de seconde fin");
});
