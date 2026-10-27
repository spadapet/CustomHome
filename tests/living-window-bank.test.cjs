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

test('three living frames share one flush sill and drywall returns with the retained top trim', () => {
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
    windowTrim: {}, wallMaterial: {}, livingSideWindowBank: bank, livingSideWindows: bank.units,
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
  vm.runInContext('windowFaceDepth = () => 0.075', context);
  vm.runInContext(source.slice(source.indexOf('  const livingWindowBank ='), source.indexOf("  windowFrame('Dining rear window'")), context);
  assert.equal(context.scene.children.length, 1);
  assert.equal(frames.length, 3);
  frames.forEach((args, index) => {
    close(args[1] + bank.x, bank.units[index].x);
    assert.equal(args[9].casing, false);
    assert.equal(args[9].picture, index === 1);
  });
  const casings = context.scene.children[0].children.filter((part) => part.name === 'Flush white window returns');
  assert.equal(casings.length, 1);
  const parts = casings[0].children;
  assert.equal(parts.filter((part) => part.name === 'White drywall jamb return').length, 2);
  for (const name of ['White drywall head return', 'White inset window sill']) {
    assert.equal(parts.filter((part) => part.name === name).length, 1, name);
  }
  close(casings[0].userData.width * 12, 90);
  const sill = parts.find((part) => part.name === 'White inset window sill');
  close(sill.w, bank.width);
  close(sill.d * 12, 6);
  close(casings[0].position.z + sill.position.z + sill.d / 2, 0.075);
  close(bank.z + 0.1 + casings[0].position.z + sill.position.z + sill.d / 2, bank.z + 0.175);
  assert.equal(parts.filter(p => /apron/i.test(p.name)).length, 0);
  assert.equal(parts.filter(p => p.name === 'White casing side board').length, 2);
  const bottom = parts.find(p => p.name === 'White casing flat bottom board');
  close(bottom.h * 12, 3.5);
  close(bottom.d * 12, 0.75);
  const sides = parts.filter(p => p.name === 'White casing side board');
  close(bottom.w, sides[1].position.x + sides[1].w / 2 - (sides[0].position.x - sides[0].w / 2));
  close(bottom.position.z + bottom.d / 2, sides[0].position.z + sides[0].d / 2);
  close(bottom.position.y + bottom.h / 2, sill.position.y - sill.h / 2);
  for (const name of ['White casing header', 'White casing header bead', 'White casing projecting cap']) {
    assert.equal(parts.filter(part => part.name === name).length, 1, name);
  }
});

test('both sides use six-inch flush sills, overriding historical plant-ledge options', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; this.rotation = {}; this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; }
    add(child) { this.children.push(child); }
    getWorldPosition(vector) { return Object.assign(vector, { y: this.position.y }); }
  }
  const context = {
    THREE: { Group, Vector3: class {} }, windowTrim: {}, wallMaterial: {}, walls: [],
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
    close(sill.d, 0.5);
    const front = side * casing.position.z + sill.position.z + sill.d / 2;
    close(front, 0.2);
    const header = casing.children.find(part => part.name === 'White casing header');
    const bead = casing.children.find(part => part.name === 'White casing header bead');
    const cap = casing.children.find(part => part.name === 'White casing projecting cap');
    close(header.h * 12, 5.5);
    close(cap.h * 12, 1);
    assert.ok(header.position.y - header.h / 2 >= 5);
    assert.ok(bead.position.y - bead.h / 2 >= 5);
    assert.ok(cap.position.y - cap.h / 2 >= header.position.y + header.h / 2 - 1e-6);
    assert.ok(cap.w > header.w);
    assert.equal(casing.children.filter(part => /apron/i.test(part.name)).length, 0);
    assert.equal(casing.children.filter(part => part.name === 'White casing side board').length, 2);
    const bottom = casing.children.find(part => part.name === 'White casing flat bottom board');
    close(bottom.d, 0.0625);
    close(bottom.position.z, 0.03125);
    close(bottom.position.y + bottom.h / 2, -1 / 12);
  }
  const parent = new Group();
  context.openingCasing(parent, 0, 3, 4, 5, 0.2, 1, true, { material: {}, depth: 3.5 / 12 });
  const plantSill = parent.children[0].children.find((part) => part.name === 'White inset window sill');
  close(plantSill.d * 12, 6);
});
