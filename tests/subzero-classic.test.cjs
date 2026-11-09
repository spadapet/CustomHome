'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');

function buildBank() {
  class Group {
    constructor() {
      this.children = []; this.userData = {}; this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const kitchen = new Group();
  const context = {
    THREE: { Group }, kitchen, ceilingHeight: 9,
    kitchenRefrigeration: ground.getKitchenRefrigerationLayout(),
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'black', 'steel'].map(name => [name, { name }])),
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(w > 0 && h > 0 && d > 0 && material);
      const part = new Group(); Object.assign(part, { w, h, d, material });
      part.position.set(x, y, z); parent.add(part); return part;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    shakerFront(parent, x, y, z, w, h, rotation) {
      const part = context.box(parent, x, y, z, w, h, 0.06, context.cabinetFinish);
      part.rotation.y = rotation; return part;
    },
    cabinetPull() {}
  };
  const start = source.indexOf('  const bottomRun =');
  const end = source.indexOf('  const island =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const all = descendants(kitchen);
  return { kitchen, all, find: name => all.filter(part => part.name === name) };
}

function bounds(node) {
  const result = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(part) {
    if (part.w) for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      let x = dx * part.w / 2, y = dy * part.h / 2, z = dz * part.d / 2;
      for (let current = part; current; current = current.parent) {
        const angle = current.rotation.y;
        [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
        x += current.position.x; y += current.position.y; z += current.position.z;
      }
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x);
      result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
      result.minZ = Math.min(result.minZ, z); result.maxZ = Math.max(result.maxZ, z);
    }
    part.children.forEach(visit);
  }
  visit(node); return result;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Classic units have full 36 x 84 fronts, separate top grilles, mirrored hinges and stainless tubular handles', () => {
  const bank = buildBank();
  const freezer = bank.find('Column freezer')[0], fridge = bank.find('Column fridge')[0];
  assert.ok(freezer.position.x > fridge.position.x, 'Freezer is view-left looking south from kitchen');
  close(freezer.position.x, 35.5); close(fridge.position.x, 29.75);
  assert.equal(freezer.userData.model, 'CL3650F/S/T/L');
  assert.equal(fridge.userData.model, 'CL3650R/S/T/R');
  for (const unit of [freezer, fridge]) {
    assert.equal(unit.userData.manufacturer, 'Sub-Zero');
    assert.equal(unit.userData.productWidthInches, 36);
    assert.equal(unit.userData.heightInches, 84);
    assert.equal(unit.userData.openingWidthInches, 35.5);
    assert.equal(unit.userData.openingHeightInches, 83.75);
    const b = bounds(unit);
    close((b.maxX - b.minX) * 12, 36); close(b.maxY * 12, 84);
    const door = unit.children.find(part => part.userData.interactiveHouseDoor);
    assert.equal(door.rotation.y, 0);
    assert.equal(door.userData.interactiveHouseDoor.maxAngleDegrees, 90);
    assert.equal(unit.userData.factoryMaxAngleDegrees, 110);
    const handle = bank.find('Sub-Zero tower-facing tubular handle').find(part => part.parent === door);
    assert.ok(handle.position.x * door.position.x < 0, 'Handle is opposite its outer hinge');
    const grille = unit.children.find(part => part.name === 'Sub-Zero Classic top grille frame');
    close(bounds(grille).minY * 12, 75.25);
    assert.equal(unit.children.filter(part => part.name === 'Sub-Zero Classic top grille louver').length, 8);
  }
  assert.equal(bank.find('Column ventilation grille').length, 0, 'Do not reuse integrated-column bottom ventilation');
  assert.equal(bank.find('Recessed fridge wall-clearance filler').length, 1);
  assert.equal(bank.find('Recessed freezer wall-clearance filler').length, 1);
  close(bank.find('Recessed fridge wall-clearance filler')[0].w * 12, 3);
  assert.equal(bank.find('Full-height refrigeration side panel').length, 4);
  const uppers = bank.find('Refrigeration upper carcass');
  assert.equal(uppers.length, 3);
  assert.deepEqual(uppers.map(part => part.w * 12), [36, 36, 31.5]);
});

test('center oven and tower retain exact size, owner-reachable mounting and independent storage', () => {
  const bank = buildBank();
  const tower = bank.find('Steam oven and pantry tower')[0];
  const oven = bank.find('Steam-oven provisional envelope')[0];
  const b = bounds(oven);
  close(tower.position.x, 32.625);
  close(tower.userData.widthInches, 31.5); close(tower.userData.clearWidthInches, 30);
  close((b.maxX - b.minX) * 12, 30); close((b.maxY - b.minY) * 12, 24);
  close((b.maxZ - b.minZ) * 12, 24); close(b.minY * 12, 30);
  assert.equal(bank.find('Steam-oven compartment shelf').length, 2);
});

test('stopped door and pull sweeps stay inside side-wall reserves and ahead of the retained island', () => {
  const bank = buildBank();
  const returnFace = ground.getKitchenRefrigerationLayout().returnX + 0.175;
  const eastFace = 37.5 - 0.175;
  const panels = bank.find('Full-height refrigeration side panel');
  const polygon = part => [-1, 1].flatMap(dx => [-1, 1].map(dz => {
    let x = dx * part.w / 2, z = dz * part.d / 2;
    for (let current = part; current; current = current.parent) {
      const angle = current.rotation.y;
      [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
      x += current.position.x; z += current.position.z;
    }
    return { x, z };
  }));
  const overlaps = (a, b) => {
    const points = [polygon(a), polygon(b)];
    for (const p of points) for (const edge of [1, 2]) {
      const axis = { x: p[edge].x - p[0].x, z: p[edge].z - p[0].z };
      const projections = points.map(corners => corners.map(corner => corner.x * axis.x + corner.z * axis.z));
      if (Math.min(...projections[0]) >= Math.max(...projections[1]) - 1e-9 || Math.min(...projections[1]) >= Math.max(...projections[0]) - 1e-9) return false;
    }
    return true;
  };
  for (const name of ['Column fridge', 'Column freezer']) {
    const unit = bank.find(name)[0];
    const door = unit.children.find(part => part.userData.interactiveHouseDoor);
    const leaf = door.children.find(part => part.name === 'Sub-Zero Classic stainless door');
    for (const panel of panels) assert.ok(bounds(panel).minZ > bounds(leaf).maxZ, 'Recess plywood sides behind the closed thick door back');
    for (let step = 0; step <= 900; step++) {
      const degrees = step / 10;
      door.rotation.y = degrees * Math.PI / 180 * door.userData.interactiveHouseDoor.openRotationSign;
      const b = bounds(door);
      assert.ok(b.minX > returnFace && b.maxX < eastFace, `${name} at ${degrees} degrees stays between finished side walls`);
      assert.ok(b.minZ > 20.95, `${name} at ${degrees} degrees stays beyond island end, including pull`);
      for (const panel of panels) assert.ok(!overlaps(leaf, panel), `${name} at ${degrees} degrees clears recessed appliance framing`);
    }
    door.rotation.y = 0;
  }
  const fridgeDoor = bank.find('Sub-Zero Classic stainless door')[1];
  close((bounds(fridgeDoor).minZ - 20.95) * 12, 43.05);
  const handle = bank.find('Sub-Zero tower-facing tubular handle')[1];
  close((bounds(handle).minZ - 20.95) * 12, 41.05);
});

test('interior floor transfer preserves total area and all passage, stair and garage boundaries', () => {
  const plan = ground.getGroundFloorDefaultPlan();
  const kidsArea = plan.floors.filter(part => part.room === 'Kids room').reduce((sum, part) => sum + part.w * part.d, 0);
  close(kidsArea, 144.58916666666667);
  close(147.29333333333332 - kidsArea, 2.7041666666666666);
  close(ground.getLivableFloorArea(plan, { includeStairs: true }), 1924.3327083333334);
  assert.equal(ground.getKitchenPassageLayout().wallX, 37.5);
  assert.equal(ground.getKitchenPassageLayout().clearWidth, 2.5);
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 31.2);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Kids west')[5], [[27 - plan.rooms.find(room => room.name === 'Kids room').z, 31.5 - plan.rooms.find(room => room.name === 'Kids room').z, 0, 8]]);
});
