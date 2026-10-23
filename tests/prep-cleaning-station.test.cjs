'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildPrepShelves() {
  class Group {
    constructor() {
      this.children = [];
      this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const roots = [];
  const context = {
    ceilingHeight: 9,
    THREE: { Group, MeshStandardMaterial: class {} },
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'oak', 'black', 'steel', 'linen', 'brass', 'cream'].map((name) => [name, { name }])),
    mat: (color) => ({ color }),
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'All pantry and cleaning-station parts use defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    }
  };
  const start = source.indexOf('  const prepShelfStart =');
  const end = source.indexOf("  tiledFloor('Mudroom tile'", start);
  assert.ok(start >= 0 && end > start, 'Locate all prep pantry geometry and contents');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, all, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, y, z] = [dx * node.w / 2, dy * node.h / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const angle = current.rotation.y;
          [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        for (const [axis, value] of [['X', x], ['Y', y], ['Z', z]]) {
          b[`min${axis}`] = Math.min(b[`min${axis}`], value);
          b[`max${axis}`] = Math.max(b[`max${axis}`], value);
        }
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return b;
}

test('only the robot bay loses its bottom food shelf and contents', () => {
  const model = buildPrepShelves();
  const pantry = model.find('Prep open pantry shelves')[0];
  const station = model.find('Prep cleaning station')[0];
  assert.equal(pantry.userData.foodBays, 4);
  assert.equal(pantry.userData.cleaningBays, 1);
  assert.equal(station.userData.convertedPantryBay, 1);
  assert.equal(model.find('Open pantry shelf').length, 4 * 7 - 1);
  const supplies = model.all.filter((item) => item.name?.startsWith('Pantry supplies bay '));
  assert.equal(supplies.length, 4 * 6 - 1);
  assert.ok(supplies.every((item) => !item.name.startsWith('Pantry supplies bay 1 ')));
  assert.equal(model.find('Pantry supplies bay 5 level 1').length, 0);
  for (const bay of [2, 3, 4]) assert.equal(model.find(`Pantry supplies bay ${bay} level 1`).length, 1);
  const bayShelves = model.find('Open pantry shelf').filter((shelf) => bounds(shelf).minX > 51.9);
  assert.equal(bayShelves.length, 6, 'Keep five food shelves and the cap above the robot');
  assert.ok(bayShelves.every((shelf) => shelf.position.y >= 2.3), 'Remove the 12-inch shelf only in the robot bay');
  assert.equal(model.find('Open pantry shelf').filter((shelf) => shelf.position.y === 1).length, 3);
  assert.equal(model.find('Cleaning station upper shelf').length, 2);
  assert.equal(model.find('Cleaning station ceiling cap').length, 1);
});

test('shallow vacuum and broom storage is separate from the threshold-free robot dock', () => {
  const model = buildPrepShelves();
  const station = model.find('Prep cleaning station')[0];
  assert.equal(station.userData.depthInches, 12);
  assert.ok(station.userData.clearWidthInches > 37);
  assert.ok(station.userData.tallOpeningHeightInches > 72);
  assert.equal(station.userData.doors, false);
  for (const name of ['Prep stored stick vacuum', 'Prep stored broom', 'Prep iRobot vacuum allowance', 'Compact robot charging base allowance', 'Cleaning station power outlet allowance']) {
    assert.equal(model.find(name).length, 1, name);
  }
  const robot = model.find('Prep iRobot vacuum allowance')[0];
  assert.equal(robot.userData.diameterInches, 14);
  assert.equal(robot.userData.modelSelected, false);
  assert.equal(robot.userData.dockingClearancesVerified, false);
  assert.equal(bounds(robot).minY, 0);
  const dock = model.find('Prep robot docking station')[0];
  assert.equal(robot.parent, dock);
  assert.equal(dock.userData.pantryBay, 5);
  assert.equal(dock.userData.floorLevelRobotAccess, true);
  assert.equal(dock.userData.threshold, false);
  assert.equal(dock.userData.doors, false);
  assert.ok(Math.abs(dock.userData.overheadClearHeightInches - 27.225) < 1e-9);
  assert.equal(model.find('Robot dock power outlet allowance').length, 1);
});

test('vacuum bay follows the moved divider and keeps about 43.3 inches to closed oven handles', () => {
  const model = buildPrepShelves();
  const station = bounds(model.find('Prep cleaning station')[0]);
  assert.ok(station.minX >= 38.3, 'Full-height end panel clears west wall trim');
  assert.ok(station.minZ > 12.225 + 0.365, 'Bay clears the prep-entry casing');
  assert.ok(station.maxY <= 9 + 1e-9);
  const originalFront = 13.15;
  const projection = originalFront - station.minZ;
  assert.ok(Math.abs(projection) < 1e-9, 'Neither cabinet nor equipment projects into the oven aisle');
  assert.ok(Math.abs((station.minZ - (13.65 - 49.3 / 12)) * 12 - 43.3) < 1e-8, 'Measure the reduced aisle against the unchanged oven handles');
  for (const name of ['Prep stored stick vacuum', 'Prep stored broom']) {
    const equipment = bounds(model.find(name)[0]);
    assert.ok(equipment.minX > station.minX && equipment.maxX < station.maxX, name);
    assert.ok(equipment.minZ > station.minZ && equipment.maxZ < station.maxZ, name);
    assert.ok(equipment.maxY < 6.2 - 0.75 / 24, name);
  }
});

test('robot parks below the opposite end shelf without deepening the cabinet or blocking the oven', () => {
  const model = buildPrepShelves();
  const dock = model.find('Prep robot docking station')[0];
  const robot = bounds(model.find('Prep iRobot vacuum allowance')[0]);
  const base = bounds(model.find('Compact robot charging base allowance')[0]);
  assert.ok(robot.minX > 51.9 && robot.maxX < 55.2, 'Robot remains in the far-east bay');
  assert.ok(base.minX > 51.9 && base.maxX < 55.2);
  assert.ok(robot.minX > 41.25, 'Robot is not opposite the oven tower');
  assert.ok(robot.minZ < 13.65, 'Only the low robot footprint projects beyond the original shelf line');
  assert.ok(robot.maxY < 2.3 - 0.75 / 24 && base.maxY < 2.3 - 0.75 / 24, 'Robot and compact base clear the next shelf');
  assert.ok(dock.children.every((part) => !part.name?.includes('side panel')), 'No deeper full-height robot cabinet');
  const pantry = model.find('Prep open pantry shelves')[0];
  assert.equal(pantry.userData.depthInches, 12);
  assert.equal(pantry.userData.cleaningBayDepthInches, 12);
  assert.equal(pantry.userData.robotDockBay, 5);
  assert.equal(model.find('Open pantry shelf').length, 27, 'Only one bottom shelf is removed');
});

test('robot and charging base turn sideways together while the power outlet stays on the rear wall', () => {
  const model = buildPrepShelves();
  const dock = model.find('Prep robot docking station')[0];
  const robot = bounds(model.find('Prep iRobot vacuum allowance')[0]);
  const base = bounds(model.find('Compact robot charging base allowance')[0]);
  assert.equal(dock.rotation.y, Math.PI / 2);
  assert.equal(model.find('Compact robot charging base allowance')[0].parent, dock);
  assert.ok(base.minX > robot.maxX, 'Dock sits east of the robot, not behind it across the aisle');
  assert.ok(Math.abs((13.15 - robot.minZ) * 12 - 2.2) < 1e-9, 'Robot still projects only 2.2 inches beyond the moved shelf front');
  assert.ok(robot.maxZ < 14.15 && base.maxZ < 14.15, 'Robot and base clear the moved rear line');
  const outlet = model.find('Robot dock power outlet allowance')[0];
  assert.equal(outlet.parent, model.find('Prep open pantry shelves')[0]);
  assert.ok(bounds(outlet).minZ > 14, 'Outlet follows the shelf backing instead of rotating with equipment');
});
