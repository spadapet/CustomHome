'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildMudroom() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const roots = [];
  const context = {
    THREE: { Group }, ceilingHeight: 9,
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'cream', 'brass', 'porcelain', 'steel', 'black', 'linen', 'countertop'].map((name) => [name, { name }])),
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'Mudroom parts use defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    tiledFloor() {}
  };
  // Reuse the real front/pull geometry, including its projection into the aisle.
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
  const start = source.indexOf("  tiledFloor('Mudroom tile'");
  const end = source.indexOf('  const epoxy', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete mudroom furnishings');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, all, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const result = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, y, z] = [dx * node.w / 2, dy * node.h / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const r = current.rotation;
          [x, y] = [x * Math.cos(r.z) - y * Math.sin(r.z), x * Math.sin(r.z) + y * Math.cos(r.z)];
          [x, z] = [x * Math.cos(r.y) + z * Math.sin(r.y), -x * Math.sin(r.y) + z * Math.cos(r.y)];
          [y, z] = [y * Math.cos(r.x) - z * Math.sin(r.x), y * Math.sin(r.x) + z * Math.cos(r.x)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        [x, y, z].forEach((value, axis) => {
          result.min[axis] = Math.min(result.min[axis], value);
          result.max[axis] = Math.max(result.max[axis], value);
        });
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return result;
}

test('five family cubbies each have two gold hooks and two open shoe levels', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.equal(cubbies.length, 5);
  assert.equal(model.find('Mudroom gold coat hook').length, 10);
  for (const cubby of cubbies) {
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom gold coat hook').length, 2);
    assert.equal(cubby.children.filter((part) => part.name === 'Open cubby shoe shelf').length, 2);
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf').length, 3);
    assert.ok(cubby.userData.clearWidthInches > 17);
  }
  const seat = model.find('Mudroom oak bench seat')[0];
  assert.equal(seat.w * 12, 90);
  assert.equal(seat.d * 12, 18);
  assert.equal((seat.position.y + seat.h / 2) * 12, 18);
});

test('laundry faces the open room and the closet visibly supports coats and extra shoes', () => {
  const model = buildMudroom();
  const laundry = model.find('Mudroom stacked washer and dryer')[0];
  assert.equal(laundry.rotation.y, Math.PI / 2);
  assert.equal(model.find('Mudroom washer concept').length, 1);
  assert.equal(model.find('Mudroom dryer concept').length, 1);
  assert.equal(model.find('Provisional laundry stacking kit').length, 1);
  assert.equal(laundry.userData.modelSelected, false);
  assert.equal(model.find('Mudroom coat hanging rail').length, 1);
  assert.equal(model.find('Mudroom hanging coat').length, 2);
  assert.equal(model.find('Closet open shoe shelf').length + model.find('Extra open shoe shelf').length, 6);
  assert.equal(model.find('Mudroom keys and charging drop zone').length, 1);
  assert.equal(model.find('Mudroom hanging coat closet')[0].userData.lowerFrontOpen, true);
});

test('storage fits below the ceiling and preserves the aisle and both entrances', () => {
  const model = buildMudroom();
  const [bench, laundry, closet] = model.roots.map(bounds);
  for (const root of model.roots) {
    const b = bounds(root);
    assert.ok(b.min[0] >= 38.3 && b.max[0] <= 45.1);
    assert.ok(b.min[2] >= 15.3 && b.max[2] <= 26.5);
    assert.ok(b.min[1] >= -1e-9 && b.max[1] <= 8.75 + 1e-9);
  }
  assert.ok((bench.min[0] - closet.max[0]) * 12 >= 36, 'Include the closed closet pull in the aisle measurement');
  assert.ok((45.225 - laundry.max[0]) * 12 >= 36, 'At least 36 inches ahead of the washer/dryer');
  assert.ok(laundry.max[2] < bench.min[2], 'Bench does not obstruct appliance access');
  assert.ok(laundry.max[2] < closet.min[2], 'Laundry and coat cases are separated');
  assert.ok(closet.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Closet clears kitchen-entry casing');
  assert.ok(bench.min[0] > 43 + (3.5 + 0.125) / 12, 'Bench clears garage-entry casing');
  assert.ok(closet.max[2] < 21.675 && bench.min[0] > 43, 'Kitchen-to-garage route remains open');
});
