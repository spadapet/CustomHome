'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getKitchenPassageLayout, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} should equal ${b}`);

test('shared floor plan provides two owner-selected doorless 30-inch clear openings with unchanged outer edges', () => {
  const layout = getKitchenPassageLayout();
  assert.equal(layout.doorless, true);
  assert.equal(layout.clearWidth * 12, 30);
  assert.equal(layout.clearHeight * 12, 96);
  assert.deepEqual(layout.passages.map(({ startZ, endZ }) => [startZ, endZ]), [[9.725, 12.225], [21.675, 24.175]]);
  const wall = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Kitchen east');
  assert.deepEqual(wall.slice(1, 5), [37.5, 7, 37.5, 25.3]);
  assert.deepEqual(wall[5], layout.openings);
  for (const [start, end, low, high] of wall[5]) {
    close((end - start) * 12, 30);
    assert.equal(low, 0);
    assert.equal(high, 8);
  }
  close((layout.passages[0].endZ + layout.passages[1].startZ) / 2, 16.95);
  close((layout.passages[1].startZ - layout.passages[0].endZ - 2 * 3.625 / 12) * 12, 106.15);
  assert.match(source, /const kitchenPassages = getKitchenPassageLayout\(\)/);
  assert.match(source, /const kitchenSideOpenings = kitchenPassages\.openings/);
});

test('applied casing stays outside each finished width and above its eight-foot clear head', () => {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { y: 0 };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
    getWorldPosition(target) {
      Object.assign(target, { x: 0, y: 0, z: 0 });
      for (let node = this; node; node = node.parent) target.y += node.position.y;
      return target;
    }
  }
  const parts = [];
  const context = {
    THREE: { Group, Vector3: class {} }, walls: [], windowTrim: {},
    box(parent, x, y, z, width, height, depth) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { width, height, depth });
      parent.add(part);
      parts.push(part);
      return part;
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const casingSideWidth ='), source.indexOf('  const baseTrimSections =')), context);
  for (const side of [-1, 1]) {
    const root = new Group();
    context.openingCasing(root, 0, 0, 2.5, 8, 0.175, side);
  }
  for (const part of parts) {
    const { x, y } = part.position;
    const intrudesWidth = x + part.width / 2 > -1.25 && x - part.width / 2 < 1.25;
    const intrudesHeight = y - part.height / 2 < 8 && y + part.height / 2 > 0;
    assert.ok(!(intrudesWidth && intrudesHeight), `${part.name} cannot reduce the 36 x 96-inch clear rectangle`);
  }
});

test('narrower stock drawer bases retain nested realistic frying pans with separate handles', () => {
  const pots = [];
  const parts = [];
  const context = {
    cookingMetal: {}, black: {},
    vessel(parent, name, x, y, z, radius, height, material, handleLength) {
      const pot = { name, x, y, z, radius, height, material, handleLength, userData: {} };
      pots.push(pot);
      return pot;
    },
    box(parent, x, y, z, width, height, depth) {
      const part = { x, y, z, width, height, depth, name: '' };
      parts.push(part);
      return part;
    }
  };
  const start = source.indexOf('    function storedCookware(');
  const end = source.indexOf('    function drainBaskets(', start);
  assert.ok(start >= 0 && end > start, 'Locate cookware builders');
  vm.runInNewContext(source.slice(start, end), context);
  const drawer = {};
  context.cookware(drawer, 20.875 / 12 - 0.28, 1, 1);
  assert.equal(pots.length, 2);
  assert.deepEqual(pots.map(({ radius, height }) => [radius * 24, height * 12]), [[10, 2], [8, 1.75]]);
  assert.ok(pots.every(({ x, handleLength }) => x === 0 && handleLength > 0));
  assert.equal(parts.filter(({ name }) => name === 'Cookware long handle').length, 2);
});
