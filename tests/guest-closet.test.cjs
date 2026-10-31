'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const suite = require('../floor-plan-ground.js').getGuestSuiteLayout();
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.children = [];
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.userData = {};
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(fn) { fn(this); this.children.forEach(child => child.traverse ? child.traverse(fn) : fn(child)); }
}

function build() {
  const roots = [];
  const context = {
    THREE: { Group },
    guestSuite: suite,
    kidsDoorway: { x: 19, z: 27, width: 4.5, height: 8 },
    oak: {}, brass: {}, black: {}, cream: {}, linen: {}, cabinetFinish: {}, cabinetRailFinish: {},
    windowTrim: {},
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, width, height, depth, material) {
      const mesh = new Group();
      mesh.name = '';
      mesh.isMesh = true;
      mesh.material = material;
      mesh.geometry = { parameters: { width, height, depth } };
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    singlePanelDoor(parent, x, y, z, width, height, depth, material, rotation = 0) {
      const leaf = context.box(parent, x, y, z, width, height, depth, material);
      leaf.rotation.y = rotation;
      return leaf;
    },
    cabinetPull() {}
  };
  const start = source.indexOf('  for (const compartment of guestSuite.closets) {');
  const end = source.indexOf('  const guestCoats =', start);
  assert.ok(start >= 0 && end > start, 'The current shallow storage and suite door geometry exists');
  vm.runInNewContext(source.slice(start, end), context);
  const all = roots.flatMap(root => {
    const descendants = [];
    root.traverse(part => descendants.push(part));
    return descendants;
  });
  return { roots, all };
}

function worldBounds(object) {
  const points = [];
  const axes = ['x', 'y', 'z'];
  const params = object.geometry.parameters;
  for (const x of [-params.width / 2, params.width / 2]) {
    for (const y of [-params.height / 2, params.height / 2]) {
      for (const z of [-params.depth / 2, params.depth / 2]) {
        const point = { x, y, z };
        for (let node = object; node; node = node.parent) {
          for (const axis of axes) {
            const angle = node.rotation[axis] || 0;
            const c = Math.cos(angle), s = Math.sin(angle);
            const before = { ...point };
            if (axis === 'x') { point.y = c * before.y - s * before.z; point.z = s * before.y + c * before.z; }
            if (axis === 'y') { point.x = c * before.x + s * before.z; point.z = -s * before.x + c * before.z; }
            if (axis === 'z') { point.x = c * before.x - s * before.y; point.y = s * before.x + c * before.y; }
          }
          point.x += node.position.x;
          point.y += node.position.y;
          point.z += node.position.z;
        }
        points.push(point);
      }
    }
  }
  return Object.fromEntries(axes.flatMap(axis => [
    [`min${axis.toUpperCase()}`, Math.min(...points.map(point => point[axis]))],
    [`max${axis.toUpperCase()}`, Math.max(...points.map(point => point[axis]))]
  ]));
}

const meshes = root => {
  const parts = [];
  root.traverse(part => { if (part.isMesh) parts.push(part); });
  return parts;
};

test('two 24-inch reach-ins occupy the shallow south-facing closet strip', () => {
  const { roots, all } = build();
  const compartments = roots.filter(root => /Guest (single|paired) shallow closet storage/.test(root.name));
  assert.equal(compartments.length, 2);
  for (const [index, root] of compartments.entries()) {
    const expected = suite.closets[index];
    assert.equal(root.userData.storageType, 'Reach-in closet');
    assert.equal(root.userData.depthInches, 24);
    assert.equal(root.userData.heightInches, 84);
    assert.equal(root.userData.separateFillers, true);
    const contents = meshes(root);
    assert.ok(contents.length > 0);
    for (const part of contents) {
      const b = worldBounds(part);
      assert.ok(b.minX >= expected.x - 1e-8 && b.maxX <= expected.x + expected.w + 1e-8, `${root.name}: ${part.name} stays within its standard cabinet envelope and fillers`);
      assert.ok(b.minZ >= suite.closet.z + 0.175 - 1e-8 && b.maxZ <= suite.closetSouthZ - 0.175 + 1e-8, `${root.name}: ${part.name} stays within finished trim faces`);
      assert.ok(b.minY >= -1e-8 && b.maxY <= 7.5, `${part.name} stays below the modeled ceiling`);
    }
  }
  assert.equal(all.filter(part => part.name === 'Guest reach-in closet hanging rod').length, 2);
  assert.equal(all.filter(part => part.name === 'Guest walk-in closet fittings').length, 0);
  assert.equal(all.filter(part => /Guest closet connected diagonal corner shelf|Guest closet pull-out drawer/.test(part.name)).length, 0);
});

test('south-opening closet doors use one 30-inch leaf and a 48-inch paired opening at 96-inch height', () => {
  const { roots, all } = build();
  const single = roots.find(root => root.name === 'Guest single-leaf closet door');
  const paired = roots.find(root => root.name === 'Guest paired-leaf closet doors');
  assert.ok(single && paired);
  assert.equal(single.userData.nominalWidthInches, 30);
  assert.equal(single.userData.nominalHeightInches, 96);
  assert.equal(single.userData.leaves, 1);
  assert.equal(paired.userData.nominalWidthInches, 48);
  assert.equal(paired.userData.nominalHeightInches, 96);
  assert.equal(paired.userData.leaves, 2);
  const leaves = all.filter(part => part.name === 'Guest closet single leaf 1 hinge' || /Guest closet paired leaf \d hinge/.test(part.name));
  assert.equal(leaves.length, 3);
  assert.ok(leaves.every(hinge => hinge.userData.interactiveHouseDoor?.maxAngleDegrees === 90));
  assert.equal(single.userData.swingDirection, 'Into guest bedroom');
  assert.equal(paired.userData.swingDirection, 'Into guest bedroom');
  assert.equal(suite.closets[0].door.width * 12, 30);
  assert.equal(suite.closets[1].door.width * 12, 48);
  assert.ok(!source.includes('Guest walk-in closet fittings'));
});
