const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../upstairs-layout.js');
const scope = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'floor-plan-upstairs.js'), 'utf8') + '\nthis.defaults = getUpstairsDefaultPlan;', scope);
const stairs = layout.stairOpening();
const baseline = JSON.parse(JSON.stringify(scope.defaults(stairs)));
const room = (plan, name) => plan.rooms.find((item) => item.name === name);
const wall = (plan, name) => plan.walls.find((item) => item.name === name);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} differs from ${expected}`);

test('every upstairs doorway is eight feet tall and remains so with saved-layout resolution', () => {
  const plan = layout.resolve(baseline, layout.empty());
  let count = 0;
  for (const wall of plan.walls) {
    for (const [, , bottom, top] of wall.openings) {
      if (bottom !== 0) continue;
      assert.equal(top, 8, `${wall.name} opening is 96 inches tall`);
      count++;
    }
  }
  assert.ok(count >= 15, 'Covers bedroom, bathroom, closet and service-room doorways');
});

test('upper arrival follows the powder-room-side flight after the stair swap', () => {
  const arrival = baseline.arrival;
  close(arrival.z + arrival.d, stairs.z + stairs.depth);
  close(arrival.x, stairs.x + stairs.width);
  const approach = baseline.floors.find((floor) => floor.name === 'North arrival approach');
  assert.ok(approach);
  close(approach.z, stairs.z);
  close(approach.z + approach.d, arrival.z);
});

test('empty overrides preserve every baseline room, wall opening, floor and window', () => {
  const plan = layout.resolve(baseline, layout.empty());
  assert.deepEqual(plan.rooms, baseline.rooms);
  assert.equal(plan.walls.length, baseline.walls.length);
  assert.equal(plan.windows.length, 11);
  baseline.walls.forEach((original) => {
    const resolved = wall(plan, original[0]);
    assert.deepEqual(resolved.openings, original[5] ?? []);
    close(resolved.thickness, 0.35);
  });
  plan.windows.forEach((window, index) => window.forEach((value, field) => {
    if (typeof value === 'number') close(value, baseline.windows[index][field]);
    else assert.equal(value, baseline.windows[index][field]);
  }));
  assert.deepEqual(plan.floors, baseline.floors);
  assert.deepEqual(layout.warnings(baseline, layout.empty()), []);
});

test('room width moves the shared wall, joins, adjoining floors and window host', () => {
  const edit = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  const plan = layout.resolve(baseline, edit);
  close(room(plan, 'Bedroom 2').w, 14);
  close(room(plan, 'Bedroom 2 bath').x, 45);
  close(room(plan, 'Bedroom 2 bath').w, 9);
  close(room(plan, 'Bedroom 2 closet').x, 45);
  close(wall(plan, 'Bedroom 2 east').x1, 45);
  close(wall(plan, 'Bath 2 north').x1, 45);
  close(wall(plan, 'Bath 2 south').x1, 45);
  const floor = plan.floors.find((item) => item.room === 'Bedroom 2');
  close(floor.w, 14);
  const before = baseline.windows.find((item) => item[0] === 'Bedroom 2');
  const after = plan.windows.find((item) => item[0] === 'Bedroom 2');
  close(after[1], 38);
  close(after[3], before[3]);
  assert.equal(layout.serialize(JSON.parse(layout.serialize(edit))), layout.serialize(edit));
});

test('wall movement updates T-junctions and neighboring room bounds without changing openings', () => {
  const document = layout.editWall(baseline, layout.empty(), 'Bedroom 2 east', { x1: 45, x2: 45 });
  const plan = layout.resolve(baseline, document);
  close(wall(plan, 'Bath 2 south').x1, 45);
  close(room(plan, 'Bedroom 2').w, 14);
  close(room(plan, 'Bedroom 2 bath').x, 45);
  const original = baseline.walls.find((item) => item[0] === 'Bedroom 2 east')[5];
  wall(plan, 'Bedroom 2 east').openings.forEach((opening, index) => close(opening[1] - opening[0], original[index][1] - original[index][0]));
});

test('wall thickness and length are real geometry data; window width stays fixed', () => {
  const document = layout.editWall(baseline, layout.empty(), 'Bedroom 2 north', { x2: 45, thickness: 0.5 });
  const plan = layout.resolve(baseline, document);
  close(layout.length(wall(plan, 'Bedroom 2 north')), 14);
  close(wall(plan, 'Bedroom 2 north').thickness, 0.5);
  close(plan.windows.find((item) => item[0] === 'Bedroom 2')[3], 4);
});

test('invalid values, unknown/duplicate objects and unsupported schema fail explicitly', () => {
  const invalid = [
    { version: 2, rooms: [], walls: [] },
    { version: 1, rooms: [], walls: [], secret: 'unexpected' },
    { version: 1, rooms: [{ name: 'Unknown', x: 0, z: 0, w: 5, d: 5 }], walls: [] },
    { version: 1, rooms: [{ name: 'Bedroom 2', x: null, z: 10, w: 13, d: 12 }], walls: [] },
    { version: 1, rooms: [{ name: 'Bedroom 2', x: 31, z: 10, w: -1, d: 12 }], walls: [] },
    { version: 1, rooms: [], walls: [{ name: 'Bedroom 2 north', x1: 31, z1: 10, x2: 44, z2: 11, thickness: 0.35 }] }
  ];
  for (const value of invalid) assert.throws(() => layout.resolve(baseline, value));
  const duplicate = { name: 'Bedroom 2', x: 31, z: 10, w: 13, d: 12 };
  assert.throws(() => layout.resolve(baseline, { version: 1, rooms: [duplicate, duplicate], walls: [] }), /duplicate/);
});

test('stair protections reject covering the void with a room or wall', () => {
  assert.throws(() => layout.editRoom(baseline, layout.empty(), 'Linen (relocated)', { x: 6 }), /stair/);
  assert.throws(() => layout.editWall(baseline, layout.empty(), 'Storage west', { x1: 6, x2: 6 }), /stair/);
});

test('relocated stairs fit the former kids room with an east-facing upper arrival', () => {
  close(stairs.x, 0.175);
  close(stairs.z, 26.775);
  close(stairs.width, 9 + 10 / 12);
  close(stairs.depth, 7.825);
  close(stairs.rotation, Math.PI);
  assert.ok(stairs.x + stairs.width < 12.2);
  assert.ok(stairs.z + stairs.depth < 36.1);
  close(baseline.arrival.x, stairs.x + stairs.width);
  close(baseline.arrival.z, stairs.z + stairs.depth - baseline.arrival.d);
  close(baseline.arrival.w, 44 / 12);
  close(baseline.arrival.d, 46.9 / 12);
  const laundry = room(baseline, 'Laundry (relocated)');
  close(laundry.x, 19);
  assert.ok(laundry.x > baseline.arrival.x + baseline.arrival.w);
  for (const floor of baseline.floors) {
    assert.ok(floor.w > 0 && floor.d > 0, floor.name);
    const xOverlap = Math.min(floor.x + floor.w, stairs.x + stairs.width) - Math.max(floor.x, stairs.x);
    const zOverlap = Math.min(floor.z + floor.d, stairs.z + stairs.depth) - Math.max(floor.z, stairs.z);
    assert.ok(xOverlap < 0.001 || zOverlap < 0.001, `${floor.name} covers the relocated stair void`);
  }
});

test('walls cannot be shortened through an opening or overlapping openings', () => {
  assert.throws(() => layout.editWall(baseline, layout.empty(), 'Bedroom 2 north', { x2: 33 }), /too short/);
  assert.throws(() => layout.editWall(baseline, layout.empty(), 'Primary suite entry', { z2: 15 }), /overlap/);
});

test('furniture anchors move proportionally but do not prescribe furniture scaling', () => {
  const edit = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  const position = layout.furniturePosition(baseline, layout.resolve(baseline, edit), 37.5, 14.5);
  close(position.x, 38);
  close(position.z, 14.5);
});

test('successive room and wall edits retain joins and round-trip without mutating prior state', () => {
  const original = JSON.stringify(baseline);
  const first = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  const firstSnapshot = layout.serialize(first);
  const second = layout.editWall(baseline, first, 'Bedroom 2 east', { x1: 45.5, x2: 45.5, thickness: 0.5 });
  const plan = layout.resolve(baseline, second);
  close(room(plan, 'Bedroom 2').w, 14.5);
  close(room(plan, 'Bedroom 2 bath').x, 45.5);
  close(room(plan, 'Bedroom 2 bath').w, 8.5);
  close(wall(plan, 'Bedroom 2 north').x2, 45.5);
  close(wall(plan, 'Bath 2 south').x1, 45.5);
  close(wall(plan, 'Bedroom 2 east').thickness, 0.5);
  assert.deepEqual(layout.resolve(baseline, JSON.parse(layout.serialize(second))), plan);
  assert.equal(layout.serialize(first), firstSnapshot);
  assert.equal(JSON.stringify(baseline), original);
  assert.throws(() => layout.editRoom(baseline, second, 'Bedroom 2', { w: -3 }));
  assert.equal(layout.serialize(first), firstSnapshot);
  assert.equal(JSON.stringify(baseline), original);
});

test('moving a room preserves its dimensions and keeps connected walls axis-aligned', () => {
  const document = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { x: 31.5 });
  const plan = layout.resolve(baseline, document);
  close(room(plan, 'Bedroom 2').x, 31.5);
  close(room(plan, 'Bedroom 2').w, 13);
  close(wall(plan, 'Bedroom 2 north').x1, 31.5);
  close(wall(plan, 'Bedroom 2 east').x1, 44.5);
  close(room(plan, 'Bedroom 2 bath').x, 44.5);
  for (const item of plan.walls) assert.ok(Math.abs(item.x1 - item.x2) < 0.001 || Math.abs(item.z1 - item.z2) < 0.001, item.name);
});

test('horizontal and vertical walls can translate in all four directions with connected joints', () => {
  for (const name of ['Bedroom 2 north', 'Bedroom 2 east']) {
    for (const [dx, dz] of [[-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25]]) {
      const before = wall(layout.resolve(baseline, layout.empty()), name);
      const document = layout.editWall(baseline, layout.empty(), name, { x1: before.x1 + dx, z1: before.z1 + dz, x2: before.x2 + dx, z2: before.z2 + dz });
      const plan = layout.resolve(baseline, document);
      const after = wall(plan, name);
      close(after.x1, before.x1 + dx);
      close(after.z1, before.z1 + dz);
      close(after.x2, before.x2 + dx);
      close(after.z2, before.z2 + dz);
      close(layout.length(after), layout.length(before));
      assert.equal(plan.walls.length, baseline.walls.length);
      for (const item of plan.walls) assert.ok(Math.abs(item.x1 - item.x2) < 0.001 || Math.abs(item.z1 - item.z2) < 0.001, item.name);
    }
  }
});
