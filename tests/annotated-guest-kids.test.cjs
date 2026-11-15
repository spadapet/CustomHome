'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../assets/js/floor-plan-ground.js');
const plan = g.getGroundFloorDefaultPlan(), suite = g.getGuestSuiteLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const area = floors => floors.reduce((sum, f) => sum + f.w * f.d, 0);

test('closet-only piano band makes the bath south and whole bedroom north full-width straight single walls', () => {
  close(suite.notch.z, suite.closet.z);
  close(suite.notch.z + suite.notch.d, suite.closetSouthZ);
  close(suite.bathroom.z, 32.97706692913386);
  close(suite.bathroom.d, 5);
  close(suite.wc.clearDepth * 12, 55.8);
  close(suite.wc.d, suite.bathroom.d);
  close(suite.wcDoor.z - suite.bathroom.z, 2.15);
  close(suite.closet.z, 37.97706692913386);
  close((suite.closet.d - 0.35) * 12, 59.4251968503937);
  close(suite.closetSouthZ, 43.27916666666667);
  close(suite.piano.z, (suite.closet.z + suite.closetSouthZ) / 2);
  for (const [name, z] of [['Bathroom south', suite.closet.z], ['Closet south', suite.closetSouthZ]]) {
    const walls = plan.walls.filter(([n]) => n === name);
    assert.equal(walls.length, 1);
    const [, x1, z1, x2, z2] = walls[0];
    close(x1, 19); close(x2, 31.2); close(z1, z); close(z2, z);
    assert.equal(plan.walls.filter(([, , a, , b]) => Math.abs(a - z) < 1e-8 && Math.abs(b - z) < 1e-8).length, 1);
  }
  assert.equal(plan.walls.some(([n]) => /^Piano recess (north|south)$/.test(n)), false);
  for (const name of ['Bathroom', 'Guest room']) {
    const floors = plan.floors.filter(f => f.room === name);
    assert.equal(floors.length, 1, `${name} is one full rectangular floor, not split/notched`);
    close(floors[0].x, 19); close(floors[0].w, 12.2);
  }
  close(g.getGroundFrontLayout().wallZ - 0.225 - suite.bedroom.z - 0.175, 11);
});

test('adopted north strip has one attribution, conserved total union and no Hall/Kitchen/suite floor overlap', () => {
  const face = g.getKitchenRefrigerationLayout().bodyFaceZ;
  const kids = plan.floors.filter(f => f.room === 'Kids room');
  close(kids[0].z, face + 0.175);
  close(26.9 - face, 25.6 / 12);
  close(area(kids), 91.78969570209975);
  const relevant = plan.floors.filter(f => ['Hall', 'Kitchen', 'Kids room', 'Bathroom', 'Closet', 'Guest room', 'Hall piano recess'].includes(f.room));
  for (let i = 0; i < relevant.length; i++) for (const b of relevant.slice(i + 1)) {
    const a = relevant[i];
    assert.ok(Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) <= 1e-8 ||
      Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) <= 1e-8, `${a.room} overlaps ${b.room}`);
  }
  // This domain is independent of every interior partition/room assignment.
  const south = g.getGroundFrontLayout().wallZ;
  const eastWing = relevant.filter(f => f.x >= 19);
  close(area(eastWing), 7.5 * (26.9 - 8) + 10.625 + 11 * (26.9 - 8) + 12.2 * (south - 26.9));
  close(g.getLivableFloorArea(plan, { includeStairs: true }), 1924.3327083333334);
});

test('standard closet built-ins and their fixing envelopes stay out of both real pocket cavities', () => {
  const [west, tower] = suite.closets;
  close(west.d * 12, 54); close(west.w * 12, 24);
  close(tower.d * 12, 30); close(tower.w * 12, 24);
  close((west.z - suite.closet.z - 0.175) * 12, 2.71259842519685);
  for (const unit of suite.closets) {
    for (const door of [suite.bathroomDoor, suite.closetDoor]) {
      close(door.pocket.clearDepth * 12, 3);
      if (unit.x + unit.w <= door.pocket.x || unit.x >= door.pocket.x + door.pocket.w) continue;
      // Storage plus a 1-inch conceptual fixing zone must not meet a pocket skin along its cavity run.
      assert.ok(unit.z - 1 / 12 > door.z + 0.175 || unit.z + unit.d + 1 / 12 < door.z - 0.175);
    }
  }
  close((tower.x - west.x - west.w) * 12, 70.6);
});
