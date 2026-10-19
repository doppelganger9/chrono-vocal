// Chronomètre annexe des retards (js/annex.js) : I 4.2.13
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnnex } from "../../js/annex.js";

const setup = () => {
  const clock = {
    t: 0,
    wall() {
      return this.t;
    },
  };
  const events = [];
  const annex = createAnnex({
    clock,
    emit: (type, d) => events.push({ type, ...d }),
  });
  const advance = (ms) => {
    for (let l = ms; l > 0; l -= 250) {
      clock.t += Math.min(250, l);
      annex.tick();
    }
  };
  return { annex, clock, events, advance };
};

test("compte le retard, avec une annonce à 1, 2 et 3 minutes", () => {
  const h = setup();
  h.annex.toggle();
  h.advance(60_000);
  assert.deepEqual(h.events, [{ type: "annex-minute", minute: 1 }]);
  h.advance(120_000);
  assert.deepEqual(
    h.events.map((e) => e.minute),
    [1, 2, 3],
  );
  h.advance(120_000);
  assert.equal(h.events.length, 3, "rien après 3 minutes");
  assert.equal(h.annex.elapsed(), 300);
});

test("arrêter, reprendre, remettre à zéro", () => {
  const h = setup();
  assert.equal(h.annex.running, false);
  h.annex.toggle();
  h.advance(10_000);
  h.annex.toggle();
  h.advance(50_000);
  assert.equal(h.annex.elapsed(), 10);
  assert.equal(h.events.length, 0);
  h.annex.toggle();
  h.advance(50_000);
  assert.equal(h.annex.elapsed(), 60);
  assert.equal(h.events.length, 1);
  h.annex.reset();
  assert.equal(h.annex.elapsed(), 0);
  assert.equal(h.annex.running, false);
  h.annex.toggle();
  h.advance(60_000);
  assert.equal(
    h.events.length,
    2,
    "les annonces repartent après remise à zéro",
  );
});
