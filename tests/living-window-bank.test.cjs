'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} should equal ${expected}`);

test('living return restores three joined windows with the patio door on the perpendicular dining wall', () => {
  const bank = getLivingRoomFeatureLayout().sideWindowBank;
  close(bank.width * 12, 90);
  close(bank.height * 12, 60);
  close(bank.sill * 12, 36);
  assert.deepEqual(bank.units.map((unit) => unit.x), [4.1, 6.6, 9.1]);
  assert.deepEqual(bank.units.map((unit) => unit.picture), [false, true, false]);
  for (let index = 1; index < bank.units.length; index++) {
    const previous = bank.units[index - 1], unit = bank.units[index];
    close(previous.x + previous.width / 2, unit.x - unit.width / 2);
  }
  const openings = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Living north')[5];
  assert.equal(openings.length, 1);
  close(openings[0][0], 2.85);
  close(openings[0][1], 10.35);
  const diningOpenings = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Dining west')[5];
  assert.equal(diningOpenings.length, 1);
  close(diningOpenings[0][0], 2.55);
  close(diningOpenings[0][1], 5.55);
  assert.deepEqual(diningOpenings[0].slice(2), [0, 8]);
  assert.deepEqual(getLivingRoomFeatureLayout().patioDoor, { x: 13.2, z: 3.95, width: 3, height: 8 });
  assert.deepEqual(openings[0].slice(2), [3, 8]);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const calls = [];
  vm.runInNewContext(exterior.slice(exterior.indexOf("  wall('living rear return'"), exterior.indexOf("  wall('dining west'")), {
    livingFeatureWall: getLivingRoomFeatureLayout(),
    win: (center, width, sill, height) => ({ center, width, sill, height }),
    wall: (...args) => calls.push(args)
  });
  assert.equal(calls.length, 1);
  const exteriorBank = calls[0][7][0];
  close(exteriorBank.width, bank.width);
  close(exteriorBank.center, 6.6);
  assert.deepEqual(exteriorBank.units, bank.units);
  assert.equal(exteriorBank.units.length, 3);
  vm.runInNewContext(exterior.slice(exterior.indexOf("  wall('dining west'"), exterior.indexOf("  wall('dining rear'")), {
    livingFeatureWall: getLivingRoomFeatureLayout(),
    wall: (...args) => calls.push(args)
  });
  const exteriorDoor = calls[1][7][0];
  assert.equal(exteriorDoor.door, true);
  close(exteriorDoor.center, 4.05);
  assert.equal(exteriorDoor.width, 3);
  assert.equal(exteriorDoor.height, 8);
  assert.equal(exteriorDoor.sill, 0);
});

test('three living frames share exactly one outer casing, sill and apron', () => {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
    getWorldPosition(vector) {
      Object.assign(vector, { x: 0, y: 0, z: 0 });
      for (let node = this; node; node = node.parent) for (const axis of ['x', 'y', 'z']) vector[axis] += node.position[axis];
      return vector;
    }
  }
  const bank = getLivingRoomFeatureLayout().sideWindowBank;
  const frames = [];
  const context = {
    THREE: { Group, Vector3: class {} }, scene: new Group(), walls: [],
    windowTrim: {}, livingSideWindowBank: bank, livingSideWindows: bank.units,
    windowFrame(...args) {
      frames.push(args);
      const frame = new Group();
      args[7].add(frame);
      return frame;
    },
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d });
      parent.add(part);
      return part;
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const casingSideWidth ='), source.indexOf('  const baseTrimSections =')), context);
  vm.runInContext(source.slice(source.indexOf('  const livingWindowBank ='), source.indexOf("  windowFrame('Dining rear window'")), context);
  assert.equal(context.scene.children.length, 1);
  assert.equal(frames.length, 3);
  frames.forEach((args, index) => {
    close(args[1] + bank.x, bank.units[index].x);
    assert.equal(args[9].casing, false);
    assert.equal(args[9].picture, index === 1);
  });
  const casings = context.scene.children[0].children.filter((part) => part.name === 'Craftsman window casing');
  assert.equal(casings.length, 1);
  const parts = casings[0].children;
  assert.equal(parts.filter((part) => part.name === 'White casing side board').length, 2);
  for (const name of ['White casing header', 'White casing projecting cap', 'White inset window sill', 'White window apron']) {
    assert.equal(parts.filter((part) => part.name === name).length, 1, name);
  }
  close(casings[0].userData.width * 12, 90);
  const sill = parts.find((part) => part.name === 'White inset window sill');
  close(sill.w, bank.width);
  close(sill.d * 12, 1.5);
  close(casings[0].position.z + sill.position.z + sill.d / 2, 0);
  assert.ok(bank.z + 0.1 + casings[0].position.z + sill.position.z + sill.d / 2 < bank.z + 0.175, 'Sill ends behind the actual room-side wall face');
});

test('ordinary sill liners remain inside either wall face while quartz plant ledges are preserved', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; this.rotation = {}; this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; }
    add(child) { this.children.push(child); }
    getWorldPosition(vector) { return Object.assign(vector, { y: this.position.y }); }
  }
  const context = {
    THREE: { Group, Vector3: class {} }, windowTrim: {}, walls: [],
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d });
      parent.add(part);
      return part;
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const casingSideWidth ='), source.indexOf('  const baseTrimSections =')), context);
  for (const side of [-1, 1]) {
    const parent = new Group();
    context.openingCasing(parent, 0, 3, 4, 5, 0.2, side, true);
    const casing = parent.children[0];
    const sill = casing.children.find((part) => part.name === 'White inset window sill');
    close(sill.w, 4);
    close(sill.d, 0.125);
    const front = side * casing.position.z + sill.position.z + sill.d / 2;
    close(front, 0);
    assert.ok(front <= 0.075, 'Even frame datums offset 0.1 ft toward the room stay behind a 0.175 ft wall face');
  }
  const parent = new Group();
  context.openingCasing(parent, 0, 3, 4, 5, 0.2, 1, true, { material: {}, depth: 3.5 / 12 });
  const plantSill = parent.children[0].children.find((part) => part.name === 'Quartz plant window sill');
  close(plantSill.d * 12, 3.5);
});
