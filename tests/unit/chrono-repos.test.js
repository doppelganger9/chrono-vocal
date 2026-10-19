// Machine à états du chrono (js/chrono.js) — minute de repos (C7, C8). Règles du corpus fonctionnel (docs/corpus-fonctionnel.md)
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./helpers.js";

const near = (actual, expected, msg) =>
  assert.ok(
    Math.abs(actual - expected) < 0.11,
    `${msg ?? ""} ${actual} ≈ ${expected}`,
  );

test("C7, C8 : annonces du repos à 30, 15 et 5 s, puis « temps » et attente du « allez »", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, calls: [30, 15, 5] });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  h.clear();
  h.advance(29_900);
  assert.deepEqual(h.types(), []);
  h.advance(200);
  assert.deepEqual(h.events, [{ type: "rest-call", sec: 30 }]);
  h.advance(15_000);
  assert.deepEqual(h.events.at(-1), { type: "rest-call", sec: 15 });
  h.advance(10_000);
  assert.deepEqual(h.events.at(-1), { type: "rest-call", sec: 5 });
  h.advance(5000);
  assert.equal(h.events.at(-1).type, "temps");
  assert.equal(h.st.phase, "ready");
  assert.equal(h.st.round, 2);
  near(h.st.remaining, 10);
  assert.equal(h.st.running, false);
});

test("une annonce de repos n'est pas faite si elle est dépassée de plus de 1,5 s", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 20, calls: [30, 15] });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  h.clear();
  h.advance(20_000);
  assert.deepEqual(
    h.events.filter((e) => e.type === "rest-call"),
    [{ type: "rest-call", sec: 15 }],
    "30 s ≥ durée du repos : jamais",
  );
});

test("« stop » pendant le repos le fige ; « fin du repos » passe à la reprise suivante", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60 });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  h.advance(10_000);
  h.chrono.stop();
  h.advance(10_000);
  near(h.st.remaining, 50);
  h.chrono.allez();
  assert.equal(h.chrono.endRest(), true);
  assert.equal(h.st.phase, "ready");
  assert.equal(h.st.round, 2);
  assert.equal(h.bout.stops.length, 0, "les arrêts du repos ne comptent pas");
});

test("pas d'annonce de repos ni de relais pendant une reprise d'assaut", () => {
  const h = setup({ roundSec: 120, calls: [30, 15, 5] });
  h.chrono.allez();
  h.advance(119_000);
  assert.deepEqual(
    h.events.filter((e) => e.type === "rest-call" || e.type === "relay"),
    [],
  );
});

test("annonce de repos à l'instant exact, et jamais si elle égale la durée du repos", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, calls: [60, 30] });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  h.clear();
  h.advance(30_000);
  assert.deepEqual(h.events, [{ type: "rest-call", sec: 30 }]);
});

test("« stop » pendant le repos le fige même si les arrêts ne sont pas décomptés", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 60, countStops: false });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  h.chrono.stop();
  h.advance(10_000);
  near(h.st.remaining, 60);
  assert.equal(h.st.running, false);
});

test("le repos dure le temps réglé", () => {
  const h = setup({ roundSec: 10, rounds: 2, restSec: 45 });
  h.chrono.allez();
  h.advance(10_000);
  h.chrono.endReprise();
  near(h.chrono.curMax(), 45);
});
