'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function build() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
    getWorldPosition(vector) {
      Object.assign(vector, { x: 0, y: 0, z: 0 });
      for (let node = this; node; node = node.parent) for (const axis of ['x', 'y', 'z']) vector[axis] += node.position[axis];
      return vector;
    }
  }
  const frames = [];
  const context = {
    THREE: { Group, Vector3: class {} }, scene: new Group(), walls: [],
    kitchenSinkX: 32, kitchenWindowWallZ: 7, kitchenSinkWindowSill: 53 / 12, kitchenSinkWindowHeight: 3.5,
    kitchenCounterWindowBank: require('../floor-plan-ground.js').getKitchenWindowBankLayout(),
    kitchenSinkWindows: require('../floor-plan-ground.js').getKitchenWindowBankLayout().units,
    windowTrim: { name: 'White trim' }, kitchenSillQuartz: { name: 'Quartz' },
    windowFrame(...args) { frames.push(args); return new Group(); },
    box(parent, x, y, z, w, h, d, material) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d, material });
      parent.add(part);
      return part;
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const casingSideWidth ='), source.indexOf('  const baseTrimSections =')), context);
  vm.runInContext(source.slice(source.indexOf('  const kitchenWindowTrim ='), source.indexOf('  const sillFlowers =')), context);
  return { context, frames, parts: context.walls };
}

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} should equal ${b}`);

test('three joined kitchen units share one slim header and sill without bulky caps or apron', () => {
  const { context, frames, parts } = build();
  assert.equal(frames.length, 3);
  frames.forEach((frame, index) => {
    const spec = context.kitchenSinkWindows[index];
    close(frame[1] + context.kitchenSinkX, spec.x);
    close(frame[3], spec.width);
    close(frame[4], 3.5);
    close(frame[5], 0);
    close(frame[7].position.y, 53 / 12);
    assert.equal(frame[9].casing, false);
    assert.equal(frame[9].picture, spec.picture);
  });
  for (const name of ['White casing header', 'White casing projecting cap', 'White window apron', 'Kitchen window flat intermediate casing']) {
    assert.equal(parts.filter((part) => part.name === name).length, 0, name);
  }
  assert.equal(parts.filter((part) => part.name === 'Slim kitchen window head edging').length, 1);
  close(parts.find((part) => part.name === 'Slim kitchen window head edging').w * 12, 92.25);
  assert.equal(parts.filter((part) => part.name === 'Quartz plant window sill').length, 1);
  const sill = parts.find((part) => part.name === 'Quartz plant window sill');
  close(sill.h * 12, 0.75);
  close(sill.d * 12, 3.5);
  close(sill.w * 12, 93.25);
  assert.equal(sill.material, context.kitchenSillQuartz);
});

test('only two outer side boards surround the bank and joined unit frames have no wall gaps', () => {
  const { context, parts } = build();
  const boards = parts.filter((part) => part.name === 'Slim kitchen window side edging');
  assert.equal(boards.length, 2);
  boards.forEach((board) => {
    close(board.w * 12, 1);
    close(board.d * 12, 0.5);
    close(board.userData.bottom, 53 / 12);
    close(board.userData.top, 95 / 12);
    assert.equal(board.material, context.windowTrim);
  });
  for (let index = 0; index < 2; index++) {
    const left = context.kitchenSinkWindows[index];
    const right = context.kitchenSinkWindows[index + 1];
    close(right.x - right.width / 2, left.x + left.width / 2);
  }
  const sill = parts.find((part) => part.name === 'Quartz plant window sill');
  const sillZ = sill.getWorldPosition({}).z;
  const potZ = 7 + 0.175 + 3.5 / 24;
  const potRadius = 3.168 / 24;
  assert.ok(potZ - potRadius > sillZ - sill.d / 2);
  assert.ok(potZ + potRadius < sillZ + sill.d / 2);
  close(potZ, sillZ);
});

test('floor plan and exterior cut one shared opening around the same 90-inch joined assembly', () => {
  const shared = require('../floor-plan-ground.js');
  const bank = shared.getKitchenWindowBankLayout();
  close(bank.width * 12, 90);
  assert.deepEqual(bank.units.map((unit) => unit.x), [29, 32, 35]);
  const north = shared.getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Kitchen north');
  assert.equal(north[5].length, 1);
  const [start, end, sill, head] = north[5][0];
  close(north[1] + start, 28.25);
  close(north[1] + end, 35.75);
  close(sill * 12, 53);
  close(head * 12, 95);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  assert.match(exterior, /\[getPrepWindowBankLayout\(\), getKitchenWindowBankLayout\(\)\]/);
});
