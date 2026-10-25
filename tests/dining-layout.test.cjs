'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function buildDining() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { y: 0 };
      this.userData = {};
    }
    add(child) { this.children.push(child); }
  }
  const roots = [];
  const context = {
    THREE: { Group }, scene: { add(group) { roots.push(group); } },
    windowTrim: {}, cream: {}, black: {}, glass: {},
    mat() { return {}; },
    windowFrame() {},
    box(parent, x, y, z, w, h, d, material) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d, material });
      parent.add(part);
      return part;
    }
  };
  context.cylinder = (parent, x, y, z, radius, height, material) => context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  const tableX =');
  const end = source.indexOf('  const kitchen =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const root = roots[0];
  const patioStart = source.indexOf('  const patioDoor =');
  const patioEnd = source.indexOf('  for (const [index, z] of livingWindowCenters', patioStart);
  assert.ok(patioStart >= 0 && patioEnd > patioStart);
  vm.runInNewContext(source.slice(patioStart, patioEnd), context);
  const patio = roots[1];
  const door = patio.children.find((part) => part.name === 'Inward-opening hinged patio door');
  return { root, table: root.children.find((part) => part.name === 'Dining table'), chairs: root.children.filter((part) => part.name === 'Dining chair'), patio, door };
}

function intersectsDoor(chair, patio, leaf, part) {
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => {
    let x = sx * part.w / 2, z = sz * part.d / 2;
    for (const node of [part, leaf, patio]) {
      const angle = node.rotation.y;
      [x, z] = [x * Math.cos(angle) + z * Math.sin(angle) + node.position.x, -x * Math.sin(angle) + z * Math.cos(angle) + node.position.z];
    }
    return [x, z];
  }));
  const angle = patio.rotation.y + leaf.rotation.y + part.rotation.y;
  const axes = [[1, 0], [0, 1], [Math.cos(angle), -Math.sin(angle)], [Math.sin(angle), Math.cos(angle)]];
  return axes.every(([x, z]) => {
    const projections = corners.map(([cx, cz]) => cx * x + cz * z);
    const center = chair.x * x + chair.z * z;
    const radius = Math.abs(x) * chair.halfX + Math.abs(z) * chair.halfZ;
    return Math.min(...projections) < center + radius - 1e-9 && Math.max(...projections) > center - radius + 1e-9;
  });
}

function rectangle(root, part, travel = 0) {
  const centerX = part.position.x - Math.sin(part.rotation.y) * travel;
  const centerZ = part.position.z - Math.cos(part.rotation.y) * travel;
  const width = 20 / 12, depth = 21 / 12;
  const angle = root.rotation.y + part.rotation.y;
  return {
    x: root.position.x + centerX * Math.cos(root.rotation.y) + centerZ * Math.sin(root.rotation.y),
    z: root.position.z - centerX * Math.sin(root.rotation.y) + centerZ * Math.cos(root.rotation.y),
    halfX: (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth) / 2,
    halfZ: (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * depth) / 2
  };
}

test('eight-person walnut study has three chairs on each side and one on each end', () => {
  const { root, table, chairs } = buildDining();
  assert.equal(root.name, 'Dining table and eight chairs');
  assert.equal(chairs.length, 8);
  assert.equal(table.w * 12, 84);
  assert.equal(table.d * 12, 38);
  assert.equal((table.position.y + table.h / 2) * 12, 29);
  assert.equal(table.userData.productSelected, false);
  assert.equal(root.rotation.y, 0);
  for (const angle of [0, Math.PI]) {
    const side = chairs.filter((chair) => chair.rotation.y === angle).sort((a, b) => a.position.x - b.position.x);
    assert.equal(side.length, 3);
    assert.ok(side.slice(1).every((chair, i) => Math.abs((chair.position.x - side[i].position.x) * 12 - 24) < 1e-9));
  }
  assert.equal(chairs.filter((chair) => Math.abs(chair.rotation.y) === Math.PI / 2).length, 2);
  assert.equal(root.children.filter((part) => part.name === 'Dining table leg').length, 4);
});

test('centered table and stowed chairs stay inside the room with equal opposite tabletop margins', () => {
  const { root, table, chairs } = buildDining();
  assert.equal(root.userData.centeredInDiningRoom, true);
  assert.ok(Math.abs(root.position.x - (13.2 + 26.875) / 2) < 1e-9);
  assert.ok(Math.abs(root.position.z - (-0.1 + 8) / 2) < 1e-9);
  const west = root.position.x - table.w / 2 - 13.375;
  const east = 26.7 - root.position.x - table.w / 2;
  assert.ok(Math.abs(west - east) < 1e-9, 'Centered on finished side walls as well as nominal room boundaries');
  assert.ok(Math.abs((root.position.z - table.d / 2 + 0.1) - (8 - root.position.z - table.d / 2)) < 1e-9);
  for (const chair of chairs) {
    const r = rectangle(root, chair);
    assert.ok(r.x - r.halfX > 13.5 && r.x + r.halfX < 26.575);
    assert.ok(r.z - r.halfZ > 0.2 && r.z + r.halfZ < 8);
  }
});

test('full chair envelopes clear each other and walls through 18-inch end-chair pull-out', () => {
  const { root, chairs } = buildDining();
  for (const travel of [0, 18 / 12]) {
    const boxes = chairs.map((chair) => rectangle(root, chair, travel));
    for (const box of boxes) {
      assert.ok(box.x - box.halfX > 13.5 && box.x + box.halfX < 26.575, 'Clear side-wall trim');
      assert.ok(box.z - box.halfZ > 0.2, 'Clear moved rear baseboard with full-depth chair allowance');
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(Math.abs(a.x - b.x) >= a.halfX + b.halfX || Math.abs(a.z - b.z) >= a.halfZ + b.halfZ, 'Adjacent chair envelopes do not overlap');
    }
  }
  const endChairs = chairs.filter((chair) => Math.abs(chair.rotation.y) === Math.PI / 2);
  assert.ok(endChairs.some((chair) => {
    const r = rectangle(root, chair, 2);
    return r.x - r.halfX < 13.5 || r.x + r.halfX > 26.575;
  }), 'Do not claim the former 24-inch end pull-outs still fit after centering');
});

test('side chairs clear the patio sweep but the end chair must be moved clear even when tucked', () => {
  const { root, chairs, patio, door } = buildDining();
  for (const travel of [0, 1.5, 2]) {
    const boxes = chairs.filter((chair) => chair.rotation.y !== -Math.PI / 2).map((chair) => rectangle(root, chair, Math.abs(chair.rotation.y) === Math.PI / 2 ? 0 : travel));
    for (let degree = 0; degree <= door.userData.maxAngleDegrees; degree++) {
      door.rotation.y = degree * Math.PI / 180;
      for (const box of boxes) for (const part of door.children) assert.equal(intersectsDoor(box, patio, door, part), false, 'Actual door leaf and hardware clear the full chair envelope when end chairs are tucked');
    }
  }
  const pulledEnd = rectangle(root, chairs.find((chair) => chair.rotation.y === -Math.PI / 2), 1.5);
  const tuckedEnd = rectangle(root, chairs.find((chair) => chair.rotation.y === -Math.PI / 2));
  let hits = 0, tuckedHits = 0;
  for (let degree = 0; degree <= door.userData.maxAngleDegrees; degree++) {
    door.rotation.y = degree * Math.PI / 180;
    if (door.children.some((part) => intersectsDoor(pulledEnd, patio, door, part))) hits++;
    if (door.children.some((part) => intersectsDoor(tuckedEnd, patio, door, part))) tuckedHits++;
  }
  assert.ok(hits > 0, 'Keep the actual pulled-end-chair conflict documented');
  assert.ok(tuckedHits > 0, 'Do not claim tucking the end chair is sufficient in the shorter room');
  assert.equal(root.userData.patioEndChairMustBeTuckedForDoor, false);
  assert.equal(root.userData.patioEndChairMustBeMovedForDoor, true);
  door.rotation.y = 0;
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /id="dining-clearance-note"[^>]*hidden/);
  assert.match(html, /24-inch end-chair pull-out reaches side-wall trim/i);
});

test('patio door starts closed and leaves the centered table and tucked chairs untouched', () => {
  const { root, chairs, patio, door } = buildDining();
  assert.equal(door.rotation.y, 0);
  assert.equal(door.userData.openAngleDegrees, 0);
  assert.equal(door.userData.outswing, false);
  assert.ok(Math.abs(root.position.x - 20.0375) < 1e-9 && Math.abs(root.position.z - 3.95) < 1e-9);
  for (const chair of chairs) for (const part of door.children) assert.equal(intersectsDoor(rectangle(root, chair), patio, door, part), false);
});

test('dining side wall aligns with kitchen base cabinets without moving the backyard wall', () => {
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const room = plan.rooms.find((item) => item.name === 'Dining room');
  assert.deepEqual(room, { name: 'Dining room', x: 13.2, z: -0.1, w: 13.675, d: 8.1 });
  const rear = plan.walls.find(([name]) => name === 'Dining north');
  assert.deepEqual(rear.slice(1), [13.2, -0.1, 26.875, -0.1, [[3.8375, 9.8375, 3, 8]]]);
  const east = plan.walls.find(([name]) => name === 'Dining east');
  assert.equal(east[1], 26.875);
  assert.equal(east[3], east[1]);
  const cabinetSideX = 32 - 3.4 - 3.8 / 2;
  assert.ok(Math.abs(east[1] - 0.35 / 2 - cabinetSideX) < 1e-9, 'Dining wall face aligns with the sink-run base-cabinet end, not its centerline');
  assert.ok(Math.abs(east[2] + east[5][0][0] - 0.5) < 1e-9, 'Patio opening retains its z position');
  const floor = plan.floors.find((item) => item.room === 'Dining room');
  assert.ok(Math.abs(floor.w * floor.d - 110.7675) < 1e-8, 'Adds only the 4.5-inch side strip, not a backyard extension');
  for (const kitchenFloor of plan.floors.filter((item) => item.room === 'Kitchen')) {
    const overlapX = Math.min(floor.x + floor.w, kitchenFloor.x + kitchenFloor.w) - Math.max(floor.x, kitchenFloor.x);
    const overlapZ = Math.min(floor.z + floor.d, kitchenFloor.z + kitchenFloor.d) - Math.max(floor.z, kitchenFloor.z);
    assert.ok(overlapX <= 1e-9 || overlapZ <= 1e-9, 'Dining and kitchen floor patches do not overlap');
  }
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom north')[2], 15);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  assert.match(exterior, /gable\('Dining rear projection roof', 13\.2, 26\.875, -0\.1, 2\.1/);
  const lot = exterior.match(/const lot = (\{[^\n]+\});/);
  const data = vm.runInNewContext(`(${lot[1]})`, { wallThickness: 0.45 });
  assert.ok(Math.abs(data.rearWallZ - data.rearSetbackFeet - (-32.325)) < 1e-9, 'Property boundary is not moved to fake the old setback');
  assert.equal(data.rearSetbackFeet, 32);
});
