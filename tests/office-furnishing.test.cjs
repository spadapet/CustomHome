'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const frontLayout = require('../floor-plan-ground.js').getGroundFrontLayout();

class Group {
  constructor() {
    this.children = [];
    this.rotation = { x: 0, y: 0, z: 0 };
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.userData = {};
  }
  add(child) { child.parent = this; this.children.push(child); }
}

class Mesh extends Group {
  constructor(geometry) { super(); Object.assign(this, geometry); }
}

function buildOfficeFurniture() {
  const roots = [];
  const context = {
    officeNorthZ: 41,
    groundFrontWallZ: frontLayout.wallZ,
    officeEntry: { x: 12.2, z: 45.25, width: 5, height: 8 },
    oak: {}, black: {}, steel: {}, cream: {}, cushion: {}, windowTrim: {}, brass: {}, glass: {},
    THREE: {
      Group, Mesh,
      MeshStandardMaterial: class {},
      SphereGeometry: class { constructor(radius) { this.w = this.h = this.d = radius * 2; } }
    },
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d) {
      const mesh = new Group();
      Object.assign(mesh, { w, h, d });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2);
    },
    stairBeam(name, start, end, width, depth, material, parent) {
      const mesh = context.box(parent, (start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
        Math.abs(end[0] - start[0]) + width, Math.abs(end[1] - start[1]) + width, Math.abs(end[2] - start[2]) + depth);
      mesh.name = name;
      return mesh;
    }
  };
  const start = source.indexOf('  const officeDeskWidth =');
  const end = source.indexOf('\n  const bedroomBedWidth =', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete office furniture placement');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, y, z] = [dx * node.w / 2, dy * node.h / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          let angle = current.rotation.z;
          [x, y] = [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
          angle = current.rotation.y;
          [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
          angle = current.rotation.x;
          [y, z] = [y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        result.minX = Math.min(result.minX, x);
        result.maxX = Math.max(result.maxX, x);
        result.minZ = Math.min(result.minZ, z);
        result.maxZ = Math.max(result.maxZ, z);
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return result;
}

test('office matches the revised top view: centered north desk, northwest equipment, southwest loveseat', () => {
  const model = buildOfficeFurniture();
  const desks = model.roots.filter(({ name }) => name.startsWith('60-inch office desk '));
  const chairs = model.roots.filter(({ name }) => name === 'Office task chair');
  const loveseat = model.roots.find(({ name }) => name === 'Office loveseat');
  assert.equal(desks.length, 2);
  assert.equal(chairs.length, 2);
  assert.ok(loveseat);

  assert.deepEqual(desks.map(({ position, rotation }) => [position.x, position.z, rotation.y]), [
    [6.1, 42.175, 0],
    [12.2 - 0.175 - 1 / 12 - 1, 50.85, -Math.PI / 2]
  ]);
  assert.deepEqual(chairs.map(({ position, rotation }) => [position.x, position.z, rotation.y]), [
    [6.1, 44.525, Math.PI],
    [12.2 - 0.175 - 1 / 12 - 1 - 2.35, 50.85, Math.PI / 2]
  ]);
  assert.ok(Math.abs(loveseat.position.x - 2.8208333333333333) < 1e-8);
  assert.ok(Math.abs(loveseat.position.z - (52.47916666666667 + frontLayout.extension)) < 1e-8);
  assert.equal(loveseat.rotation.y, Math.PI);
  assert.equal(loveseat.userData.widthInches, 60);
  assert.equal(loveseat.userData.productSelected, false);
  assert.equal(model.find('Office monitor').length, 4);
  const elliptical = model.roots.find(({ name }) => name === 'SOLE E20 elliptical concept');
  assert.equal(elliptical.position.x, 1.65);
  assert.ok(Math.abs(elliptical.position.z - 44.02916666666667) < 1e-8);
  assert.equal(elliptical.rotation.y, 0);
  assert.equal(elliptical.userData.lengthInches, 65);
  assert.equal(elliptical.userData.widthInches, 22);

  const deskTops = model.find('60-inch desktop');
  assert.equal(deskTops.length, 2);
  const northDesktop = bounds(deskTops[0]);
  assert.ok(Math.abs((northDesktop.minX - 0.175) - (12.025 - northDesktop.maxX)) < 1e-8, 'North desktop is centered between actual finished side walls');
  assert.ok(Math.abs(northDesktop.minZ - 41.175) < 1e-8, 'North desktop backs onto north paint');
  assert.ok(Math.abs((12.025 - bounds(deskTops[1]).maxX) * 12 - 1) < 1e-8, 'East desktop is one inch from the finished wall');

  const sofa = bounds(loveseat);
  assert.ok(Math.abs((sofa.maxX - sofa.minX) * 12 - 60) < 1e-8, 'Restore the full 60-inch loveseat instead of shrinking it to fit');
  assert.ok(Math.abs((sofa.maxZ - sofa.minZ) * 12 - 33.6) < 1e-8);
  assert.ok(Math.abs((sofa.minX - 0.2375) * 12 - 1) < 1e-8, 'Loveseat clears west baseboard by one inch');
  assert.ok(Math.abs((frontLayout.wallZ - 0.2375 - sofa.maxZ) * 12 - 1) < 1e-8, 'Loveseat clears south baseboard by one inch');
  const sofaTop = Math.max(...loveseat.children.map(mesh => mesh.position.y + mesh.h / 2));
  const windowSill = require('../floor-plan-ground.js').getGroundFrontWindows()[0].sill;
  assert.ok(Math.abs((windowSill - 1 / 12 - sofaTop) * 12 - 2.6) < 1e-8, 'Loveseat back is 2.6 inches below the one-inch sill underside; access is not implied');
  const machine = bounds(elliptical);
  assert.ok(Math.abs((machine.minZ - 41.2375) * 12 - 1) < 1e-8, 'Equipment clears north baseboard by one inch');
  assert.ok(Math.abs((northDesktop.minX - machine.maxX) * 12 - 12.4) < 1e-8, 'Desk-to-equipment side gap is 12.4 inches, not a route');
  assert.ok(Math.abs((sofa.minZ - machine.maxZ) * 12 - (52.1 + frontLayout.extension * 12)) < 1e-8, 'Equipment access gap grows by the front extension');
  const doorLeafWidth = 29.75 / 12;
  const doorLeafTipX = 12.2 - doorLeafWidth;
  assert.ok(sofa.maxX < doorLeafTipX, 'Southwest loveseat stays west of both open leaf tips');
  for (const hingeZ of [45.25 - (2.5 - 0.125 / 12), 45.25 + (2.5 - 0.125 / 12)]) {
    const nearestX = 12.2 - sofa.maxX;
    const nearestZ = Math.max(sofa.minZ - hingeZ, 0, hingeZ - sofa.maxZ);
    assert.ok(Math.hypot(nearestX, nearestZ) > doorLeafWidth, 'Loveseat stays outside the modeled door-leaf swing radius');
  }
});

const overlaps = (a, b) => a.maxX > b.minX + 1e-8 && b.maxX > a.minX + 1e-8 &&
  a.maxZ > b.minZ + 1e-8 && b.maxZ > a.minZ + 1e-8;

test('furniture clears paint and other furniture with both chairs in place and pulled out 18 inches', () => {
  const model = buildOfficeFurniture();
  const furniture = model.roots.filter(({ name }) => name !== 'Office white ten-lite French doors');
  const chairs = furniture.filter(({ name }) => name === 'Office task chair');
  for (const pull of [0, 18 / 12]) {
    chairs[0].position.z = 44.525 + pull;
    chairs[1].position.x = 12.2 - 0.175 - 1 / 12 - 1 - 2.35 - pull;
    const boxes = furniture.map(root => ({ root, ...bounds(root) }));
    for (const b of boxes) {
      assert.ok(b.minX >= 0.175 - 1e-8 && b.maxX <= 12.025 + 1e-8 &&
        b.minZ >= 41.175 - 1e-8 && b.maxZ <= frontLayout.wallZ - 0.175 + 1e-8, `${b.root.name} clears finished walls`);
      for (const other of boxes) if (b !== other) assert.ok(!overlaps(b, other), `${b.root.name} overlaps ${other.root.name} at ${pull * 12} in pull`);
    }
  }
});

test('actual French leaves and hardware clear the arrangement through the full new 0-90 degree stop', () => {
  const model = buildOfficeFurniture();
  const doors = model.roots.find(({ name }) => name === 'Office white ten-lite French doors');
  const furniture = model.roots.filter(root => root !== doors);
  const chairs = furniture.filter(({ name }) => name === 'Office task chair');
  assert.equal(doors.userData.openAngleDegrees, 90);
  for (const leaf of doors.children) {
    const interaction = leaf.userData.interactiveHouseDoor;
    assert.equal(interaction.openAngleDegrees, 90);
    assert.equal(interaction.maxAngleDegrees, 90, 'Stop at 90; the old 180-degree concept conflicts with the east desk');
    const defaultRotation = leaf.rotation.y;
    for (const pull of [0, 18 / 12]) {
      chairs[0].position.z = 44.525 + pull;
      chairs[1].position.x = 12.2 - 0.175 - 1 / 12 - 1 - 2.35 - pull;
      for (let degrees = 0; degrees <= interaction.maxAngleDegrees; degrees++) {
        leaf.rotation.y = interaction.openRotationSign * degrees * Math.PI / 180;
        for (const mesh of leaf.children) for (const root of furniture)
          assert.ok(!overlaps(bounds(mesh), bounds(root)), `${leaf.name} ${mesh.name} hits ${root.name} at ${degrees} degrees`);
      }
    }
    leaf.rotation.y = defaultRotation;
    assert.equal(leaf.rotation.y, leaf.userData.inwardOpenRotation, 'Restore the owner 90-degree default');
  }
});

test('a continuous 30-inch study route reaches both work areas, loveseat and exercise approach', () => {
  const model = buildOfficeFurniture();
  const doors = model.roots.find(({ name }) => name === 'Office white ten-lite French doors');
  const furniture = model.roots.filter(root => root !== doors);
  const chairs = furniture.filter(({ name }) => name === 'Office task chair');
  const radius = 15 / 12;
  const paths = [
    [[12.1, 45.25], [8.6, 44.8]],
    [[12.1, 45.25], [8.7, 45.25], [8.46, 47.2], [8.3, 48.4], [2.5, 48.4]],
    [[12.1, 45.25], [8.7, 45.25], [8.46, 47.2], [8.3, 48.4], [5.5, 48.4], [3, 49.6]]
  ];
  for (let pull = 0; pull <= 18; pull += 3) {
    chairs[0].position.z = 44.525 + pull / 12;
    chairs[1].position.x = 12.2 - 0.175 - 1 / 12 - 1 - 2.35 - pull / 12;
    const obstacles = [...furniture, ...doors.children].map(bounds);
    for (const path of paths) for (let index = 1; index < path.length; index++) {
      const [a, b] = [path[index - 1], path[index]];
      for (let sample = 0; sample <= 100; sample++) {
        const x = a[0] + (b[0] - a[0]) * sample / 100;
        const z = a[1] + (b[1] - a[1]) * sample / 100;
        assert.ok(x - radius >= 0.175 && z - radius >= 41.175 && z + radius <= frontLayout.wallZ - 0.175);
        for (const box of obstacles) {
          const dx = Math.max(box.minX - x, 0, x - box.maxX);
          const dz = Math.max(box.minZ - z, 0, z - box.maxZ);
          assert.ok(Math.hypot(dx, dz) >= radius - 1e-8, `30 in study route blocked at (${x}, ${z}), chair pull ${pull} in`);
        }
      }
    }
  }
});
