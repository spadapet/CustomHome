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
    addWindowShadeDivisions: require('../floor-plan-ground.js').addWindowShadeDivisions,
    THREE: { Group, Vector3: class {} }, scene: new Group(), walls: [],
    kitchenSinkX: 32, kitchenWindowWallZ: 7, kitchenSinkWindowSill: 3.5, kitchenSinkWindowHeight: 4.5,
    kitchenCounterWindowBank: require('../floor-plan-ground.js').getKitchenWindowBankLayout(),
    kitchenSinkWindows: require('../floor-plan-ground.js').getKitchenWindowBankLayout().units,
    windowTrim: { name: 'White trim' }, wallMaterial: { name: 'White drywall' }, kitchenSillQuartz: { name: 'Quartz' },
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
  vm.runInContext('windowFaceDepth = () => 0.075', context);
  vm.runInContext(source.slice(source.indexOf('  const kitchenWindowTrim ='), source.indexOf('  const sillFlowers =')), context);
  return { context, frames, parts: context.walls };
}

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} should equal ${b}`);

test('three joined kitchen units share one flush white sill and retained header', () => {
  const { context, frames, parts } = build();
  assert.equal(frames.length, 3);
  assert.equal(frames[0][7].userData.unitCount, 3);
  frames.forEach((frame, index) => {
    const spec = context.kitchenSinkWindows[index];
    close(frame[1] + context.kitchenSinkX, spec.x);
    close(frame[3], spec.width);
    close(frame[4], 4.5);
    close(frame[5], 0);
    close(frame[7].position.y, 3.5);
    assert.equal(frame[9].casing, false);
    assert.equal(frame[9].picture, spec.picture);
  });
  for (const name of ['White window apron', 'White casing flat bottom board', 'Kitchen window flat intermediate casing', 'Quartz plant window sill']) {
    assert.equal(parts.filter((part) => part.name === name).length, 0, name);
  }
  for (const name of ['White casing header', 'White casing header bead', 'White casing projecting cap']) {
    assert.equal(parts.filter((part) => part.name === name).length, 1, name);
  }
  const header = parts.find((part) => part.name === 'White casing header');
  close(header.h * 12, 5.5);
  const cap = parts.find((part) => part.name === 'White casing projecting cap');
  close(cap.h * 12, 1);
  assert.ok(cap.userData.bottom > header.userData.bottom);
  assert.equal(parts.filter((part) => part.name === 'White inset window sill').length, 1);
  const sill = parts.find((part) => part.name === 'White inset window sill');
  close(sill.h * 12, 1);
  close(sill.d * 12, 6);
  close(sill.w * 12, 90);
  assert.equal(sill.material, context.windowTrim);
  close(sill.userData.top * 12, 42);
  close(sill.userData.bottom * 12, 41);
  assert.equal(parts.some(part => part.name === 'White casing flat bottom board'), false);
  close(cap.userData.top * 12, 102.625);
  assert.ok(cap.userData.top < 9, 'retained cap fits below unchanged lower wall/roof datum');
});

test('two flat drywall returns surround the bank and joined unit frames have no wall gaps', () => {
  const { context, parts } = build();
  const boards = parts.filter((part) => part.name === 'White drywall jamb return');
  assert.equal(boards.length, 2);
  boards.forEach((board) => {
    close(board.w * 12, 0.6);
    close(board.d * 12, 6);
    close(board.userData.bottom, 3.5);
    close(board.userData.top, 8);
    assert.equal(board.material, context.windowTrim);
  });
  for (let index = 0; index < context.kitchenSinkWindows.length - 1; index++) {
    const left = context.kitchenSinkWindows[index];
    const right = context.kitchenSinkWindows[index + 1];
    close(right.x - right.width / 2, left.x + left.width / 2);
  }
  const sill = parts.find((part) => part.name === 'White inset window sill');
  const sillZ = sill.getWorldPosition({}).z;
  const potZ = 7 + 0.175 - 0.25;
  const potRadius = 3.168 / 24;
  assert.ok(potZ - potRadius > sillZ - sill.d / 2);
  assert.ok(potZ + potRadius < sillZ + sill.d / 2);
  close(potZ, sillZ);
});

test('floor plan and exterior cut one shared opening around the same 90-inch bank', () => {
  const shared = require('../floor-plan-ground.js');
  const bank = shared.getKitchenWindowBankLayout();
  close(bank.width * 12, 90);
  assert.deepEqual(bank.units.map((unit) => unit.x), [29, 32, 35]);
  const north = shared.getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Kitchen north');
  assert.equal(north[5].length, 1);
  const [start, end, sill, head] = north[5][0];
  close(north[1] + start, 28.25);
  close(north[1] + end, 35.75);
  close(sill * 12, 42);
  close(head * 12, 96);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  assert.match(exterior, /\[getPrepWindowBankLayout\(\), getKitchenWindowBankLayout\(\)\]/);
  let rear;
  const context = {
    getPrepWindowBankLayout: shared.getPrepWindowBankLayout,
    getKitchenWindowBankLayout: shared.getKitchenWindowBankLayout,
    win: (center, width, sill, height) => ({ center, width, sill, height }),
    wall: (...args) => { rear = args; }
  };
  vm.runInNewContext(exterior.split('\n').find(line => line.includes("wall('kitchen and prep rear'")), context);
  const cut = rear[7].find(o => o.trimLabel === 'Kitchen');
  close(55.5 - cut.center, 32);
  close(cut.width, 7.5);
  close(cut.sill, 3.5);
  close(cut.height, 4.5);
  close(cut.frameSill + cut.frameHeight, 8);
  close(cut.frameSill + cut.frameHeight + 0.2 + 0.3 / 2, 8.35);
  assert.ok(cut.frameSill + cut.frameHeight + 0.35 < rear[6]);
});

test('approved height retains section widths, fixed center and prep datums', () => {
  const shared = require('../floor-plan-ground.js');
  const bank = shared.getKitchenWindowBankLayout();
  assert.deepEqual(bank.units.map(u => [u.width * 12, u.height * 12, u.sill * 12, (u.sill + u.height) * 12, u.picture]),
    [[18, 54, 42, 96, false], [54, 54, 42, 96, true], [18, 54, 42, 96, false]]);
  assert.equal(bank.assemblyApproved, false);
  const prep = shared.getPrepWindowBankLayout();
  close(prep.openingHeight * 12, 60);
  close(prep.openingSill * 12, 41);
  close(prep.openingWidth * 12, 107);
  prep.units.forEach(u => {
    close(u.height * 12, 59.5);
    close(u.sill * 12, 41.25);
  });
  const end = shared.getPrepWindowLayout().find(u => u.z !== 7);
  close(end.openingHeight * 12, 72);
  close(end.openingSill * 12, 29);
});
