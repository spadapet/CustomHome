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
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const roots = [];
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  const context = {
    THREE: { Group, Mesh, CanvasTexture: class {}, PlaneGeometry: class {}, MeshBasicMaterial: class {} }, ceilingHeight: 9,
    document: { createElement() { return { getContext() { return { fillRect() {}, fillText() {} }; } }; } },
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
    tiledFloor() {},
    mat() { return {}; }
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

test('five backed cubbies have side-panel hooks and unobstructed floor-level large-shoe openings', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.equal(cubbies.length, 5);
  assert.equal(model.find('Mudroom gold coat hook').length, 10);
  for (const cubby of cubbies) {
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom gold coat hook').length, 2);
    assert.equal(cubby.children.filter((part) => part.name === 'Open cubby shoe shelf').length, 0, 'No shelf lip or intermediate shelf obstructs kicking shoes in');
    for (const hook of cubby.children.filter((part) => part.name === 'Mudroom gold coat hook')) {
      assert.equal(hook.userData.mount, 'Cubby side panel');
      assert.ok(Math.abs(Math.abs(hook.rotation.y) - Math.PI / 2) < 1e-9);
      const plate = bounds(hook.children.find((part) => part.name === 'Hook mounting plate'));
      const divider = model.find('Mudroom cubby partition').map(bounds).find((panel) => Math.abs(plate.min[2] - panel.max[2]) < 1e-8 || Math.abs(plate.max[2] - panel.min[2]) < 1e-8);
      assert.ok(divider, 'Hook mounting plate touches an actual side divider');
    }
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf').length, 3);
    assert.ok(cubby.userData.clearWidthInches > 17);
  }
  const seat = model.find('Mudroom oak bench seat')[0];
  assert.equal(seat.w * 12, 90);
  assert.equal(seat.d * 12, 18);
  assert.equal((seat.position.y + seat.h / 2) * 12, 18);
  const backing = model.find('Continuous white-oak cubby backing')[0];
  assert.equal(backing.material.name, 'Muted matcha-green mudroom built-ins');
  assert.equal(backing.h, 8.75);
  assert.ok((seat.position.y - seat.h / 2 - 0.0405) * 12 >= 14, 'At least 14-inch actual clear height above finished tile/grout');
  assert.ok((0.75 - (backing.position.z + backing.d / 2)) * 12 >= 16, 'At least 16-inch clear shoe depth');
});

test('conventional enclosed coat closet has a transverse rail and standard bifold door', () => {
  const model = buildMudroom();
  assert.equal(model.roots.length, 5);
  for (const name of ['Mudroom stacked washer and dryer', 'Mudroom washer concept', 'Mudroom dryer concept', 'Provisional laundry stacking kit', 'Laundry reservation side panel', 'Laundry overhead compartment floor']) {
    assert.equal(model.find(name).length, 0, `${name} must not remain in the mudroom`);
  }
  assert.equal(model.find('Mudroom coat hanging rail').length, 1);
  assert.equal(model.find('Mudroom hanging coat').length, 4);
  assert.equal(model.find('Closet open shoe shelf').length, 2);
  assert.equal(model.find('Coat closet upper shelf').length, 3);
  assert.equal(model.find('Mudroom sliding coat closet door').length, 0);
  assert.equal(model.find('Full-overlay Shaker cabinet front').length, 0, 'Mudroom uses simple builder-installed open shelving');
  assert.equal(model.find('Mudroom keys and charging drop zone').length, 1);
  const closet = model.find('Mudroom hanging coat closet')[0];
  assert.equal(closet.userData.widthInches, 36);
  assert.equal(closet.userData.depthInches, 24);
  assert.equal(closet.userData.railOrientation, 'Side to side');
  assert.match(closet.userData.doorStyle, /32-inch bifold/);
  assert.equal(model.find('Mudroom standard bifold door panel').length, 4);
  assert.equal(model.find('Mudroom closet headwall').length, 1);
  assert.equal(model.find('Mudroom coat hanging rail')[0].rotation.z, Math.PI / 2);
  for (const coat of model.find('Mudroom hanging coat')) {
    const b = bounds(coat), c = bounds(closet);
    assert.ok(b.min.every((value, axis) => value >= c.min[axis]) && b.max.every((value, axis) => value <= c.max[axis]), 'Illustrated front-facing coats fit inside shallow bay');
  }
});

test('each family member has a divided removable bin on builder-installed shelves', () => {
  const model = buildMudroom();
  const owners = ['Child 1', 'Child 2', 'Child 3', 'Mom', 'Dad'];
  const drawers = model.find('Mudroom personal accessory bin');
  assert.equal(drawers.length, 5);
  assert.deepEqual(drawers.map((drawer) => drawer.userData.owner), owners);
  assert.deepEqual(model.find('Mudroom family cubby').map((cubby) => cubby.userData.owner), owners);
  for (const drawer of drawers) {
    assert.deepEqual(Array.from(drawer.userData.contents), ['Socks', 'Gloves', 'Hats']);
    assert.equal(drawer.userData.removableContainers, 3);
    const containers = drawer.children.filter((part) => part.name === 'Removable accessory container');
    assert.equal(containers.length, 3);
    assert.ok(containers.every((container) => container.userData.purchasedSeparately));
    assert.equal(model.find(`Mudroom label: ${drawer.userData.owner}`).length, 2, 'Matching cubby and drawer labels');
  }
  assert.ok(drawers.slice(0, 3).every((drawer) => bounds(drawer).max[1] * 12 < 24), 'Children use the three lowest drawers');
  assert.ok(drawers.every((drawer) => bounds(drawer).max[1] * 12 < 38));
  assert.equal(model.find('Family seasonal storage shelf').length, 4);
});

test('east shoe wall holds 21 extra pair envelopes without blocking the coat bay', () => {
  const model = buildMudroom();
  const wall = model.find('Mudroom extra family shoe wall')[0];
  const cells = model.find('Mudroom extra shoe pair cell');
  assert.equal(wall.userData.extraPairTarget, 21);
  assert.equal(cells.length, 21);
  assert.equal(model.find('Stored extra shoe').length, 42);
  const shelves = model.find('Extra shoe pair shelf').map(bounds);
  const seasonal = model.find('Extra shoe wall seasonal shelf').map(bounds);
  for (const cell of cells) {
    assert.ok(cell.userData.clearWidthInches >= 10.5);
    assert.ok(cell.userData.depthInches >= 12.5);
    assert.equal(cell.userData.pairs, 1);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok((shelf.max[2] - shelf.min[2]) * 12 >= 12, 'Actual shelf fits target pair width');
    assert.ok((shelf.max[0] - shelf.min[0]) * 12 >= 12.5, 'Actual shelf fits target pair depth');
    const above = [...shelves, ...seasonal].filter((next) => next.min[1] > shelf.max[1] && next.min[0] < shelf.max[0] && next.max[0] > shelf.min[0]);
    assert.ok((Math.min(...above.map((next) => next.min[1])) - shelf.max[1]) * 12 >= 9, 'Actual shelf separation fits the nine-inch pair height');
  }
  assert.equal(model.find('Extra shoe wall seasonal shelf').length, 3);
  const shoeBounds = bounds(wall);
  assert.ok(Math.abs((shoeBounds.max[2] - shoeBounds.min[2]) * 12 - 42) < 0.000001);
});

test('shallow bin shelves leave a 48-inch central aisle without projecting drawer runners', () => {
  const model = buildMudroom();
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const tower = model.find('Mudroom family drawer and seasonal storage tower')[0];
  const drawerBounds = bounds(tower);
  const closed = (bench.min[0] - drawerBounds.max[0]) * 12;
  assert.ok(closed >= 46, `Closed-case aisle is ${closed} inches, including pulls`);
  assert.ok(closed >= 48);
  assert.equal(tower.userData.bins, 5);
  assert.equal(tower.userData.drawerTravelInches, undefined);
  assert.equal(tower.userData.depthInches, 14);
  const coat = bounds(model.find('Mudroom hanging coat closet')[0]);
  assert.ok((bench.min[0] - coat.max[0]) * 12 >= 36, 'Northern closet corner also retains at least 36 inches between case projections');
});

test('storage fits below the ceiling with no case overlap and keeps the entry route clear', () => {
  const model = buildMudroom();
  const [bench, closet, drawers] = model.roots.map(bounds);
  for (const root of model.roots) {
    const b = bounds(root);
    assert.ok(b.min[0] >= 38.3 && b.max[0] <= 45.1);
    assert.ok(b.min[2] >= 15.3 && b.max[2] <= 26.9 - 0.175 - 1 / 12, 'Built-ins clear the finished walls and projecting baseboards');
    assert.ok(b.min[1] >= -1e-9 && b.max[1] <= 8.75 + 1e-9);
  }
  for (let first = 0; first < model.roots.length; first++) for (let second = first + 1; second < model.roots.length; second++) {
    const parts = (root) => model.all.filter((part) => {
      if (part.w === undefined) return false;
      for (let node = part; node; node = node.parent) if (node === root) return true;
      return false;
    });
    for (const aPart of parts(model.roots[first])) for (const bPart of parts(model.roots[second])) {
      const a = bounds(aPart), b = bounds(bPart);
      assert.ok(a.max.some((value, axis) => value <= b.min[axis] + 0.000001 || b.max[axis] <= a.min[axis] + 0.000001), `${aPart.name} and ${bPart.name} join without positive overlap`);
    }
  }
  assert.ok(drawers.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Drawer tower clears fixed kitchen-entry casing');
  assert.ok(closet.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Closet clears kitchen-entry casing');
  assert.ok(bench.min[0] > 43 + (3.5 + 0.125) / 12, 'Bench clears garage-entry casing');
  assert.ok(closet.max[2] < 21.675 && bench.min[0] > 43, 'Kitchen-to-garage route remains open');
  const entryTurningArea = { min: [38.4, 0, 21.5], max: [43.4, 6, 26.5] };
  for (const root of model.roots) {
    const b = bounds(root);
    assert.ok(b.max.some((value, axis) => value <= entryTurningArea.min[axis] || b.min[axis] >= entryTurningArea.max[axis]), 'Keep a five-foot-square storage-free arrival/turning zone; this is not an accessibility certification');
  }
});

test('the entire enclosed coat front has a 36-inch deep storage-free approach', () => {
  const model = buildMudroom();
  const coat = model.find('Mudroom hanging coat closet')[0];
  const c = bounds(coat);
  const approach = { min: [c.max[0], 0, c.min[2]], max: [c.max[0] + 3, 6.4, c.max[2]] };
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    let inCoat = false;
    for (let node = part; node; node = node.parent) if (node === coat) inCoat = true;
    if (inCoat) continue;
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= approach.min[axis] || b.min[axis] >= approach.max[axis]), 'No shoe tower, shelf return, or bin unit blocks any part of the coat approach');
  }
});

test('kitchen stays fixed while the eight-foot garage entry shifts six inches away from the truck', () => {
  assert.ok(source.includes('const garageEntry = { x: 39.5, z: 26.725, width: 3, going: 11 / 12, height: 8 }'));
  assert.match(source, /const kitchenSideOpenings = \[9\.725, 21\.675\]/);
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const kitchen = plan.walls.find((wall) => wall[0] === 'Kitchen east');
  const garage = plan.walls.find((wall) => wall[0] === 'Mudroom south');
  assert.deepEqual(kitchen[5][1], [14.675, 17.175, 0, 8]);
  assert.deepEqual(garage[5], [[1.5, 4.5, 0, 8]]);
});

test('matcha-green connections join both storage runs and bridge overhead without reducing headroom', () => {
  const model = buildMudroom();
  assert.equal(model.find('Mudroom west full-height joint filler').length, 1);
  assert.equal(model.find('Mudroom east full-height joint filler').length, 1);
  const shelves = model.find('Mudroom connecting upper shelf');
  assert.equal(shelves.length, 3);
  assert.ok(shelves.every((shelf) => bounds(shelf).min[1] >= 6.8 - 1e-9));
  assert.ok(model.all.filter((part) => /shelf|backing|divider|headwall|joint filler|bifold.*panel/i.test(part.name || '')).every((part) => part.material?.name === 'Muted matcha-green mudroom built-ins'));
});

test('dedicated mudroom camera is available in the toolbar and room menu', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(source, /mudroom: \{ target: \[41\.8, 2, 20\.9\]/);
  assert.equal((html.match(/data-view="mudroom"/g) || []).length, 2);
});
