'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const suite = require('../floor-plan-ground.js').getGuestSuiteLayout();
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.name = '';
    this.children = [];
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.userData = {};
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(fn) { fn(this); this.children.forEach(child => child.traverse(fn)); }
}

class Mesh extends Group {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  }
}

function box(parent, x, y, z, width, height, depth, material) {
  const mesh = new Mesh({ parameters: { width, height, depth } }, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function build() {
  const roots = [];
  const context = {
    THREE: {
      Group, Mesh,
      TorusGeometry: class {
        constructor(radius, tube) { this.parameters = { width: 2 * (radius + tube), height: 2 * (radius + tube), depth: 2 * tube }; }
      }
    },
    guestSuite: suite,
    porcelain: {}, countertop: {}, glass: {}, cream: {}, brass: {}, steel: {}, cabinetFinish: {}, cabinetRailFinish: {},
    guestVanityStone: {}, oak: {}, windowTrim: {},
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box,
    cylinder(parent, x, y, z, radius, height, material) {
      return box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    shakerFront(parent, x, y, z, width, height) {
      const front = box(parent, x, y, z, width, height, 0.08, context.cabinetFinish);
      front.userData = {};
      return front;
    },
    cabinetPull() {},
    singlePanelDoor(parent, x, y, z, width, height, depth, material, rotation = 0) {
      const leaf = box(parent, x, y, z, width, height, depth, material);
      leaf.rotation.y = rotation;
      return leaf;
    }
  };
  const functionsStart = source.indexOf('  function toilet(name,');
  const functionsEnd = source.indexOf('  const powderStone', functionsStart);
  assert.ok(functionsStart >= 0 && functionsEnd > functionsStart, 'Current toilet and vanity geometry is present');
  vm.runInNewContext(source.slice(functionsStart, functionsEnd), context);
  context.toilet('Guest bathroom toilet', suite.toilet.x, suite.toilet.z, suite.toilet.rotation);
  context.vanity('Guest bathroom vanity', suite.vanity.x, suite.vanity.z, suite.vanity.width,
    suite.vanity.rotation, suite.vanity.basinCount, suite.vanity.mirrorWidth);

  const doorStart = source.indexOf('  const bathroomOpening = guestSuite.bathroomDoor;');
  const doorEnd = source.indexOf('  const guestCoats =', doorStart);
  assert.ok(doorStart >= 0 && doorEnd > doorStart, 'Current bathroom door geometry is present');
  vm.runInNewContext(source.slice(doorStart, doorEnd), context);

  const showerStart = source.indexOf('  const showerLayout = guestSuite.shower;');
  const showerEnd = source.indexOf('  const frontDoor =', showerStart);
  assert.ok(showerStart >= 0 && showerEnd > showerStart, 'Current shower geometry is present');
  vm.runInNewContext(source.slice(showerStart, showerEnd), context);
  return { roots, find: name => roots.find(root => root.name === name) };
}

function worldBounds(object) {
  const points = [];
  for (const x of [-object.geometry.parameters.width / 2, object.geometry.parameters.width / 2]) {
    for (const y of [-object.geometry.parameters.height / 2, object.geometry.parameters.height / 2]) {
      for (const z of [-object.geometry.parameters.depth / 2, object.geometry.parameters.depth / 2]) {
        const point = { x, y, z };
        for (let node = object; node; node = node.parent) {
          point.x *= node.scale.x; point.y *= node.scale.y; point.z *= node.scale.z;
          for (const axis of ['x', 'y', 'z']) {
            const angle = node.rotation[axis] || 0, c = Math.cos(angle), s = Math.sin(angle), before = { ...point };
            if (axis === 'x') { point.y = c * before.y - s * before.z; point.z = s * before.y + c * before.z; }
            if (axis === 'y') { point.x = c * before.x + s * before.z; point.z = -s * before.x + c * before.z; }
            if (axis === 'z') { point.x = c * before.x - s * before.y; point.y = s * before.x + c * before.y; }
          }
          point.x += node.position.x; point.y += node.position.y; point.z += node.position.z;
        }
        points.push(point);
      }
    }
  }
  return Object.fromEntries(['x', 'y', 'z'].flatMap(axis => [
    [`min${axis.toUpperCase()}`, Math.min(...points.map(point => point[axis]))],
    [`max${axis.toUpperCase()}`, Math.max(...points.map(point => point[axis]))]
  ]));
}

const meshes = root => {
  const parts = [];
  root.traverse(part => { if (part.isMesh) parts.push(part); });
  return parts;
};

function intersectsXZ(a, b) {
  return Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 1e-6
    && Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 1e-6;
}

test('image-scaled guest bath positions fixtures in the west / north-middle / north-east sequence', () => {
  const model = build();
  const shower = model.find('Guest bathroom shower');
  const toilet = model.find('Guest bathroom toilet');
  const vanity = model.find('Guest bathroom vanity');
  assert.ok(shower && toilet && vanity);
  assert.equal(shower.userData.clearWidthInches, 36);
  assert.equal(shower.userData.clearDepthInches, 51);
  assert.equal(shower.userData.doorOpeningInches, 30);
  assert.equal(vanity.userData.widthInches, 30);
  assert.equal(vanity.userData.depthInches, 18);
  assert.equal(vanity.userData.basinCount, 1);
  assert.ok(suite.vanity.x > suite.toilet.x, 'Vanity is east of the toilet');
  const showerBounds = worldBounds(meshes(shower)[0]);
  close(showerBounds.minX, suite.shower.x);
  assert.ok(worldBounds(meshes(shower)[0]).maxX < suite.toilet.x - 1);

  const toiletBounds = meshes(toilet).map(worldBounds).reduce(union);
  const vanityBounds = meshes(vanity).map(worldBounds).reduce(union);
  close(suite.toilet.x, 24.5);
  close(suite.toilet.z, 38.475);
  close(suite.vanity.x, 27.05);
  close(suite.vanity.z, 38.15);
  close(toiletBounds.minZ, suite.bathroom.z + 0.175);
  assert.ok(suite.toilet.x > suite.bathroom.x + suite.shower.w, 'Toilet is beyond the west shower zone');
  assert.ok(suite.toilet.z < suite.bathroom.z + suite.bathroom.d / 2, 'Toilet is north of bath center');
  assert.ok(toiletBounds.maxZ < suite.bathroomDoor.z - 0.175, 'Toilet remains north of the finished south wall');
  assert.ok((suite.bathroomDoor.z - 0.175 - toiletBounds.maxZ) * 12 >= 30, 'Modeled southward floor approach before the finished wall is at least 30 in');
  for (const toiletPart of meshes(toilet)) {
    const toiletPartBounds = worldBounds(toiletPart);
    for (const vanityPart of meshes(vanity)) {
      assert.equal(intersectsXZ(toiletPartBounds, worldBounds(vanityPart)), false,
        `toilet part does not geometrically overlap vanity part ${vanityPart.name}`);
    }
  }
  assert.ok(vanityBounds.minX >= suite.bathroom.x, 'Vanity remains within the full-width bath');
});

test('southeast bath door has a west hinge, 30 x 96 in leaf and sampled inward sweep clear of fixtures', () => {
  const model = build();
  const door = model.find('Guest bathroom southeast inward-opening door');
  assert.ok(door);
  assert.equal(door.userData.hinge, 'West jamb');
  assert.equal(door.userData.nominalWidthInches, 30);
  assert.equal(door.userData.heightInches, 96);
  assert.equal(door.userData.inward, true);
  assert.equal(door.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  const fixtures = ['Guest bathroom toilet', 'Guest bathroom vanity', 'Guest bathroom shower']
    .map(name => meshes(model.find(name)).map(worldBounds));
  const movingParts = meshes(door);
  const leaf = movingParts.find(mesh => Math.abs(mesh.geometry.parameters.width - 2.46) < 1e-9);
  assert.ok(leaf, 'The actual 29.52-inch leaf is present');
  const original = door.rotation.y;
  for (let degrees = 0; degrees <= 90; degrees += 5) {
    door.rotation.y = degrees * Math.PI / 180;
    for (const movingPart of movingParts) {
      const bounds = worldBounds(movingPart);
      for (const fixtureParts of fixtures) {
        for (const fixture of fixtureParts) assert.equal(intersectsXZ(bounds, fixture), false, `door leaf/handle clears fixtures at ${degrees} degrees`);
      }
    }
  }
  door.rotation.y = original;
});

function union(a, b) {
  return {
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), minZ: Math.min(a.minZ, b.minZ),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY), maxZ: Math.max(a.maxZ, b.maxZ)
  };
}

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);
}
