'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGuestEntryLayout, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const entry = getGuestEntryLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

function build() {
  const parts = [], beams = [];
  class Group { constructor() { this.userData = {}; } add() {} }
  const start = source.indexOf('  const guard = guestEntry.stairGuard;');
  const end = source.indexOf('  for (const upper of [false, true])', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    guestEntry: entry, black: {},
    THREE: { Group }, stairs: new Group(), stairOpening: layout.stairOpening(), stairDepth: layout.stairOpening().depth,
    stairFloorToFloor: 10, stairRise: 7.5 / 12, stairGoing: 10 / 12, stairRun: 70 / 12, landingHeight: 5, oak: {},
    stairBeam(name, start, end) { beams.push({ name, start, end }); },
    furnishing(name, x, z, rotation, elevation) { close(elevation, 0.005); return { name }; },
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  });
  parts.beams = beams;
  return parts;
}

test('October 31 closet closes the north wall and moves powder access to the south end of the alcove', () => {
  const plan = getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Powder north'), ['Powder north', 0, 35.1, 12.2, 35.1]);
  close(entry.powderDoor.z, 38);
  close(entry.powderDoor.width, 2.5);
  assert.equal(entry.powderDoor.height, 8);
  const opening = plan.walls.find(([name]) => name === 'Powder east').at(-1)[0];
  for (const [i, value] of [2.9, 5.4, 0, 8].entries()) close(opening[i], value);
  assert.match(source, /\[0, powderNorthZ, guestEntry\.coatCloset\.x \+ guestEntry\.coatCloset\.w, powderNorthZ\]/);
  assert.ok(plan.floors.some(f => f.room === 'Guest entry alcove' && f.x === 7.1 && f.z === 37.5 && f.w === 5.1 && f.d === 3.5));
});

test('newly exposed upper-flight edge is guarded through the upstairs guard junction', () => {
  const parts = build(), beams = parts.beams;
  const handrails = beams.filter(b => b.name === 'Exposed upper-flight handrail');
  assert.equal(handrails.length, 2);
  close(layout.stairOpening().x + layout.stairOpening().width - handrails[0].start[0], entry.stairGuard.x);
  assert.deepEqual(handrails[0].end, handrails[1].start);
  assert.deepEqual(Array.from(handrails[1].end), [0, 13, layout.stairOpening().depth]);
  assert.equal(beams.filter(b => b.name === 'Exposed upper-flight horizontal rail').length, 16);
  assert.equal(parts.filter(p => p.name === 'Exposed upper-flight guard post').length, 3);
});

test('restored solid closet wall replaces only the ground guard, without a buried rail or old wall-end trim exclusion', () => {
  assert.ok(!source.includes("furnishing('Guest entry stair-side guard'"));
  assert.ok(!source.includes('box(alcoveGuard,'));
  assert.ok(!source.includes('cover(new THREE.Vector2(guestEntry.stairGuard.x'));
  assert.equal(build().filter(p => /^Alcove stair/.test(p.name)).length, 0);
  assert.ok(source.includes('Retain protection above the restored wall'));
});

test('closet closure leaves the canonical stair footprint and retained upper guard endpoint unchanged', () => {
  const g = entry.stairGuard, opening = layout.stairOpening();
  close(g.endX, opening.x + opening.width);
  close((12.2 - g.endX) * 12, 26.3);
  close((g.endX - (7.45 + 12.2) / 2) * 12, 2.2);
  close((g.endX - g.x) * 12, 30.7);
  const plan = getGroundFloorDefaultPlan();
  assert.ok(plan.floors.some(f => f.x <= g.endX && f.x + f.w >= 12.2 && f.z <= opening.z && f.z + f.d >= opening.z + opening.depth),
    'Removed rail must back onto the continuous ground-floor strip beyond the stair void');
  close(entry.powder.z - 0.175 - opening.z - opening.depth, 1 / 12);
  const north = plan.walls.find(([name]) => name === 'Powder north');
  assert.ok(north[3] >= g.endX, 'Wall encloses the whole closet, not only the former rail span');
});

test('south alcove remains open to the hall with the same measured baseboard-to-baseboard approach', () => {
  const northFace = entry.alcove.z + 0.175 + 0.75 / 12;
  const southFace = entry.officeNorthZ - 0.175 - 0.75 / 12;
  close((southFace - northFace) * 12, 36.3);
  const z = (northFace + southFace) / 2;
  assert.ok(z - 1.5 > northFace && z + 1.5 < southFace, 'A modeled 36-inch-wide strip fits between baseboards; not occupied-use approval');
  const plan = getGroundFloorDefaultPlan();
  const east = plan.walls.find(([name]) => name === 'Guest coat closet east');
  close(east[4], entry.alcove.z);
  assert.ok(!plan.walls.some(([, x1, z1, x2, z2]) => x1 === 12.2 && x2 === 12.2 &&
    Math.min(z1, z2) < entry.officeNorthZ && Math.max(z1, z2) > entry.alcove.z), 'No wall closes the hall-facing alcove');
});
