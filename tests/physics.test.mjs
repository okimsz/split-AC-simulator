import { test } from "node:test";
import assert from "node:assert/strict";
import { state, operating, finEfficiency } from "../src/physics.js";

const defaults = { ...state };
function reset() {
  Object.assign(state, defaults);
}

test("heat rejection balances cooling plus electrical input across the controls", () => {
  for (const ambient of [25, 35, 43]) {
    for (const conductivity of [50, 205, 385]) {
      reset();
      Object.assign(state, { ambient, conductivity });
      const data = operating(1 / 60);
      assert.ok(Object.values(data).every(Number.isFinite));
      assert.ok(Math.abs(data.rejected - data.cooling - data.watts) < 1e-10);
    }
  }
});

test("coil area and conductivity change capacity in the expected direction", () => {
  reset();
  const reference = operating(0).cooling;
  state.area = 0.6;
  assert.ok(Math.abs(operating(0).cooling / reference - 0.6) < 1e-12);
  assert.ok(finEfficiency(50) < finEfficiency(205));
  assert.ok(finEfficiency(205) < finEfficiency(385));
});

test("motion pause freezes mechanical angles but room physics continues", () => {
  reset();
  state.speed = 0;
  const before = { ...state };
  operating(0.05);
  for (const name of ["angle", "fanAngle", "outAngle", "flowPhase"])
    assert.equal(state[name], before[name]);
  assert.notEqual(state.room, before.room);
});

test("switching power off eventually stops cooling and rotation", () => {
  reset();
  state.on = false;
  for (let step = 0; step < 1500; step++) operating(0.05);
  const data = operating(0);
  assert.equal(data.rpm, 0);
  assert.equal(data.cooling, 0);
  assert.equal(data.watts, 0);
});
