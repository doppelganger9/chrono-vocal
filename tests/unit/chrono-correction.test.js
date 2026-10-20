// Sanction corrigée ou retirée par la suite de la phrase de l'arbitre (#110)
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./helpers.js";

function arrete() {
  const h = setup({ rounds: 2, roundSec: 60 });
  h.chrono.allez();
  h.advance(5000);
  h.chrono.stop();
  return h;
}

test("corriger une sanction : nouveau motif, même reprise, même arrêt, même heure, même place", () => {
  const h = arrete();
  const first = h.chrono.addEvent({ type: "observation", pts: 0 });
  h.advance(1000);
  const other = h.chrono.addEvent({
    type: "observation",
    pts: 0,
    color: "bleu",
  });
  const t = first.t;
  const ev = h.chrono.replaceEvent(first, {
    type: "penalite",
    pts: 1,
    detail: "sortie d'aire",
    color: "rouge",
  });
  assert.deepEqual(ev, {
    type: "penalite",
    pts: 1,
    detail: "sortie d'aire",
    color: "rouge",
    round: 1,
    t,
    stop: 0,
  });
  assert.deepEqual(h.bout.events, [ev, other]);
});

test("corriger ou retirer une sanction qui n'est plus dans l'assaut : rien", () => {
  const h = arrete();
  const snap = h.chrono.snapshot();
  const ev = h.chrono.addEvent({ type: "observation", pts: 0 });
  h.chrono.restore(snap); // « Annuler »
  assert.equal(h.chrono.replaceEvent(ev, { type: "penalite", pts: 1 }), null);
  assert.equal(h.chrono.removeEvent(ev), false);
  assert.deepEqual(h.bout.events, []);
});

test("retirer une sanction : les autres restent", () => {
  const h = arrete();
  const a = h.chrono.addEvent({ type: "observation", pts: 0, color: "rouge" });
  const b = h.chrono.addEvent({ type: "observation", pts: 0, color: "bleu" });
  assert.equal(h.chrono.removeEvent(a), true);
  assert.deepEqual(h.bout.events, [b]);
});
