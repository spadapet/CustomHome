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
    mat(color, roughness) { return { color, roughness }; }
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

function boxParts(model, root) {
  return model.all.filter((part) => {
    if (part.w === undefined) return false;
    for (let node = part; node; node = node.parent) if (node === root) return true;
    return false;
  });
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
  assert.ok(model.find('Mudroom cubby partition').every((part) => part.d === seat.d && part.position.z === 0), 'Upper dividers now align with the bench front without enlarging its footprint');
  assert.ok(model.find('Mudroom upper cubby shelf').every((part) => part.d === seat.d && part.position.z === 0));
  const backing = model.find('Continuous mudroom cubby backing')[0];
  assert.equal(backing.material.name, 'Soft putty mudroom backing');
  assert.equal(backing.h, 8.75);
  assert.ok((seat.position.y - seat.h / 2 - 0.0405) * 12 >= 14, 'At least 14-inch actual clear height above finished tile/grout');
  assert.ok((0.75 - (backing.position.z + backing.d / 2)) * 12 >= 16, 'At least 16-inch clear shoe depth');
});

test('conventional enclosed coat closet has a transverse rail and standard bifold door', () => {
  const model = buildMudroom();
  assert.equal(model.roots.length, 6);
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
  assert.equal(model.find('Family upper shoe divider').length, 1);
  assert.equal(model.find('Family tower top cap').length, 1);
});

test('three joined shoe zones fit 22 extra pair envelopes, including larger corner shoes', () => {
  const model = buildMudroom();
  const wall = model.find('Mudroom extra family shoe wall')[0];
  const cells = model.find('Mudroom extra shoe pair cell');
  assert.equal(wall.userData.extraPairTarget, 7);
  assert.equal(cells.length, 22);
  assert.equal(model.find('Stored extra shoe').length, 44);
  assert.equal(cells.filter((cell) => cell.userData.zone === 'West return').length, 7);
  assert.equal(cells.filter((cell) => cell.userData.zone === 'Beside cubbies').length, 7);
  assert.equal(cells.filter((cell) => cell.userData.zone === 'Above personal containers').length, 8);
  const shelves = model.find('Extra shoe pair shelf').map(bounds);
  const caps = [...model.find('Extra shoe wall seasonal shelf'), ...model.find('Family tower top cap'), ...model.find('Corner shoe tower top cap')].map(bounds);
  const trimBottom = bounds(model.find('Mudroom continuous west top rail')[0]).min[1];
  for (const cell of cells) {
    const [width, depth, height] = cell.userData.pairEnvelopeInches;
    assert.ok(cell.userData.clearWidthInches >= width);
    assert.ok(cell.userData.depthInches >= depth);
    assert.ok(cell.userData.clearHeightInches >= height);
    assert.equal(cell.userData.pairs, 1);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok((shelf.max[2] - shelf.min[2]) * 12 >= width, 'Actual shelf fits target pair width');
    assert.ok((shelf.max[0] - shelf.min[0]) * 12 >= depth, 'Actual shelf fits target pair depth');
    const above = [...shelves, ...caps].filter((next) => next.min[1] > shelf.max[1] && [0, 2].every((axis) => Math.min(next.max[axis], shelf.max[axis]) - Math.max(next.min[axis], shelf.min[axis]) > 0.000001));
    assert.ok((Math.min(trimBottom, ...above.map((next) => next.min[1])) - shelf.max[1]) * 12 >= height, 'Actual shelf and front-trim opening fit the target height, not just a metadata allowance');
  }
  assert.equal(model.find('Extra shoe wall seasonal shelf').length, 3);
  const shoeBounds = bounds(wall);
  assert.ok(Math.abs((shoeBounds.max[2] - shoeBounds.min[2]) * 12 - 14.32) < 0.000001);
  const binBounds = bounds(model.find('Mudroom family container and shoe tower')[0]);
  assert.ok(Math.abs(shoeBounds.max[2] - binBounds.min[2]) < 1e-6, 'Shoe and accessory run connect without projecting into the center aisle');
});

test('shallow bin shelves leave a 48-inch central aisle without projecting drawer runners', () => {
  const model = buildMudroom();
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const tower = model.find('Mudroom family container and shoe tower')[0];
  const drawerBounds = bounds(tower);
  const closed = (bench.min[0] - drawerBounds.max[0]) * 12;
  assert.ok(closed >= 46, `Closed-case aisle is ${closed} inches, including pulls`);
  assert.ok(closed >= 48);
  assert.equal(tower.userData.bins, 5);
  assert.equal(tower.userData.drawerTravelInches, undefined);
  assert.equal(tower.userData.depthInches, 14);
  const coat = model.find('Mudroom hanging coat closet')[0];
  assert.ok(Math.abs(coat.position.x - (38 + 45.4) / 2) < 1e-9, 'Coat closet is centered on the back wall');
  assert.equal(coat.rotation.y, 0, 'Closed coat doors face into the room, not sideways from the corner');
});

test('storage fits below the ceiling with no case overlap and keeps the entry route clear', () => {
  const model = buildMudroom();
  const [bench, closet, drawers] = model.roots.map(bounds);
  for (const root of model.roots) {
    const b = bounds(root);
    assert.ok(b.min[0] >= 38.3 && b.max[0] <= 45.1);
    assert.ok(b.min[2] >= 14.8 && b.max[2] <= 26.9 - 0.175 - 1 / 12, 'Built-ins clear the moved north wall and unchanged south baseboards');
    assert.ok(b.min[1] >= -1e-9 && b.max[1] <= 8.75 + 1e-9);
  }
  for (let first = 0; first < model.roots.length; first++) for (let second = first + 1; second < model.roots.length; second++) {
    for (const aPart of boxParts(model, model.roots[first])) for (const bPart of boxParts(model, model.roots[second])) {
      const a = bounds(aPart), b = bounds(bPart);
      assert.ok(a.max.some((value, axis) => value <= b.min[axis] + 0.000001 || b.max[axis] <= a.min[axis] + 0.000001), `${aPart.name} and ${bPart.name} join without positive overlap`);
    }
  }
  assert.ok(drawers.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Drawer tower clears fixed kitchen-entry casing');
  assert.ok(closet.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Closet clears kitchen-entry casing');
  assert.ok(bench.min[0] > 43 + (3.5 + 0.125) / 12, 'Bench clears garage-entry casing');
  assert.ok(closet.max[2] < 21.675 && bench.min[0] > 43, 'Kitchen-to-garage route remains open');
  const entryTurningArea = { min: [38.4, 0, 21.5], max: [43.4, 6, 26.5] };
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= entryTurningArea.min[axis] || b.min[axis] >= entryTurningArea.max[axis]), 'Keep a five-foot-square storage-free arrival/turning zone; this is not an accessibility certification');
  }
});

test('the entire enclosed coat front has a 36-inch deep storage-free approach', () => {
  const model = buildMudroom();
  const coat = model.find('Mudroom hanging coat closet')[0];
  const c = bounds(coat);
  const approach = { min: [c.min[0], 0, c.max[2]], max: [c.max[0], 6.4, c.max[2] + 3] };
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

test('uniform enclosure closes both blind corners instead of leaving shelf bridges and open gaps', () => {
  const model = buildMudroom();
  const corners = model.find('Mudroom enclosed corner return');
  assert.equal(corners.length, 2);
  assert.equal(model.find('Mudroom connecting upper shelf').length, 0);
  assert.equal(model.find('Mudroom east return upper shelf').length, 0);
  for (const corner of corners) {
    assert.equal(corner.userData.accessibleStorage, false, 'Blind corners are explicitly not counted as usable storage');
    assert.ok(Math.abs(bounds(corner).max[1] * 12 - 105) < 0.000001);
    assert.ok(Math.abs(bounds(corner).min[2] - 14.9) < 0.000001);
    assert.ok(Math.abs(bounds(corner).max[2] - 17.54) < 0.000001);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner front').length, 1);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner cheek').length, 2);
  }
});

test('only the prep/mudroom divider moves north six inches while kitchen symmetry and garage entry stay fixed', () => {
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom north').slice(1), [38, 14.5, 45.4, 14.5]);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom east').slice(1), [45.4, 14.5, 45.4, 26.9]);
  const mud = plan.rooms.find((room) => room.name === 'Mudroom');
  assert.equal(mud.z, 14.5);
  assert.equal(mud.d, 12.4);
  const prepFloors = plan.floors.filter((floor) => floor.room === 'Prep kitchen');
  assert.ok(Math.abs(prepFloors.reduce((area, floor) => area + floor.w * floor.d, 0) - (17.5 * 8 - 7.4 * 0.5)) < 1e-9);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom south')[2], 26.9);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Kitchen east')[5], [[2.725, 5.225, 0, 8], [14.675, 17.175, 0, 8]]);
  const model = buildMudroom();
  assert.equal(model.find('Mudroom hanging coat closet')[0].position.z, 15.9);
  assert.equal(model.find('Five-cubby mudroom bench')[0].position.z, 22.85);
});

test('neutral mudroom finishes keep ivory casework, putty backs and a white-oak coat front without green paint', () => {
  const model = buildMudroom();
  const ivoryParts = [
    'Open shoe bay divider', 'Mudroom cubby partition', 'Mudroom upper cubby shelf', 'Coat closet side panel',
    'Closet open shoe shelf', 'Coat closet upper shelf', 'Family container tower side', 'Family container tower recessed plinth',
    'Personal bin support shelf', 'Family upper shoe divider', 'Family tower top cap', 'Extra shoe wall divider',
    'Extra shoe pair shelf', 'Extra shoe wall seasonal shelf', 'Corner shoe tower side', 'Corner shoe tower top cap',
    'Enclosed corner horizontal panel', 'Enclosed corner back', 'Enclosed corner front', 'Enclosed corner cheek',
    'Coat header top return', 'Mudroom continuous north top rail', 'Mudroom continuous west top rail', 'Mudroom continuous east top rail'
  ];
  const backingParts = [
    'Continuous mudroom cubby backing', 'Coat closet backing', 'Family container tower backing', 'Extra shoe wall backing', 'Corner shoe tower backing'
  ];
  const oakFrontParts = ['Mudroom closet door jamb', 'Mudroom closet headwall', 'Mudroom standard bifold door panel', 'Mudroom bifold recessed panel'];
  const binParts = ['Personal bin bottom', 'Personal bin side', 'Personal bin back', 'Personal bin low front'];
  for (const [names, finish, color] of [
    [ivoryParts, 'Warm ivory mudroom casework', '#eee8dc'],
    [backingParts, 'Soft putty mudroom backing', '#ded6c8'],
    [binParts, 'Oatmeal fabric mudroom containers', '#c9b89d']
  ]) {
    for (const name of names) {
      const parts = model.find(name);
      assert.ok(parts.length > 0, `${name} exists`);
      for (const part of parts) {
        assert.equal(part.material.name, finish, `${name} uses its intended finish`);
        assert.equal(part.material.color, color);
      }
    }
  }
  for (const [name, count] of [['Mudroom closet door jamb', 2], ['Mudroom closet headwall', 1], ['Mudroom standard bifold door panel', 4]]) {
    const parts = model.find(name);
    assert.equal(parts.length, count);
    assert.ok(parts.every((part) => part.material.name === 'cabinetFinish'), `${name} reuses the kitchen's vertical white-oak grain`);
  }
  const recessed = model.find('Mudroom bifold recessed panel');
  assert.equal(recessed.length, 8);
  assert.ok(recessed.every((part) => part.material.name === 'cabinetPanelFinish'), 'Recessed bifold panels retain the matching white-oak panel finish');
  assert.ok(model.all.every((part) => !/matcha|green/i.test(part.material?.name || '') && part.material?.color !== '#8a9b74'), 'No green-painted built-in material remains');
  const wood = model.all.filter((part) => ['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish'].includes(part.material?.name));
  assert.equal(wood.length, 17);
  assert.ok(wood.every((part) => [...oakFrontParts, 'Mudroom keys and charging drop zone', 'Mudroom oak bench seat'].includes(part.name)), 'Only the coat front, bench and drop surface are oak');
  const seat = model.find('Mudroom oak bench seat')[0], drop = model.find('Mudroom keys and charging drop zone')[0];
  assert.equal(seat.material.name, 'cabinetRailFinish');
  assert.equal(seat.material, drop.material, 'Bench and drop zone keep the kitchen horizontal white-oak grain');
  assert.ok(model.find('Mudroom gold coat hook').every((hook) => hook.children.every((part) => part.material.name === 'brass')));
  assert.ok(model.find('Mudroom closet gold knob').every((part) => part.material.name === 'brass'));
  assert.ok(model.find('Stored extra shoe').every((part) => part.material.name === 'linen'), 'Container recoloring does not mutate shared clothing/shoe materials');
});

test('all six case groups share a 105-inch top with physically connected north and side trim', () => {
  const model = buildMudroom();
  const enclosure = model.find('Continuous mudroom built-in enclosure')[0];
  assert.equal(enclosure.userData.uniformTopInches, 105);
  assert.equal(enclosure.userData.extraPairTarget, 22);
  assert.equal(enclosure.userData.blindCornersCountedAsStorage, false);
  const rails = ['west', 'north', 'east'].map((side) => bounds(model.find(`Mudroom continuous ${side} top rail`)[0]));
  assert.ok(rails.every((rail) => Math.abs(rail.max[1] * 12 - 105) < 1e-9 && rail.min[1] * 12 >= 103.5));
  assert.ok(Math.abs(rails[0].max[0] - rails[1].min[0]) < 1e-9, 'West and back top rails meet with no horizontal gap');
  assert.ok(Math.abs(rails[1].max[0] - rails[2].min[0]) < 1e-9, 'Back and east top rails meet with no horizontal gap');
  const joinParts = boxParts(model, enclosure).map(bounds);
  for (const root of model.roots.filter((root) => root !== enclosure)) {
    assert.ok(Math.abs(bounds(root).max[1] * 12 - 105) < 1e-9, `${root.name} keeps the same top height`);
    assert.ok(boxParts(model, root).some((part) => {
      const b = bounds(part);
      return joinParts.some((joint) => {
        const overlaps = b.max.map((max, axis) => Math.min(max, joint.max[axis]) - Math.max(b.min[axis], joint.min[axis]));
        return overlaps.every((value) => value >= -1e-6) && overlaps.some((value) => Math.abs(value) <= 1e-6);
      });
    }), `${root.name} actually touches the shared enclosure, not merely matching its color`);
  }
});

test('storage returns fill the former side gaps without widening the working aisle footprint', () => {
  const model = buildMudroom();
  const west = bounds(model.find('Mudroom extra family shoe wall')[0]);
  const bins = bounds(model.find('Mudroom family container and shoe tower')[0]);
  const corner = bounds(model.find('Mudroom corner shoe tower')[0]);
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  assert.ok(Math.abs(west.min[2] - 17.54) < 1e-9);
  assert.ok(Math.abs(west.max[2] - bins.min[2]) < 1e-9);
  assert.ok(Math.abs(corner.min[2] - 17.54) < 1e-9);
  assert.ok(Math.abs(corner.max[2] - bench.min[2]) < 1e-9);
  assert.ok(Math.abs(corner.min[0] - bench.min[0]) < 1e-9, 'New right return and cubby faces stay on the same 18-inch-deep footprint');
  assert.equal(model.find('Personal bin support shelf').length, 5);
  assert.equal(model.find('Removable accessory container').length, 15);
  assert.equal(model.find('Mudroom personal accessory drawer').length, 0);
});

test('dedicated mudroom camera is available in the toolbar and room menu', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(source, /mudroom: \{ target: \[41\.8, 2, 20\.9\]/);
  assert.equal((html.match(/data-view="mudroom"/g) || []).length, 2);
});

test('enclosure inspection uses an inside-room perspective without moving outside on portrait screens', () => {
  const start = source.indexOf('    const aspect = viewport.clientWidth / viewport.clientHeight;', source.indexOf('  function setView(name) {'));
  const end = source.indexOf('    const basementCutaway', start);
  const preset = source.match(/'mudroom-storage': (\{ target: \[[^\]]+\], offset: \[[^\]]+\], span: [\d.]+ \})/);
  assert.ok(start >= 0 && end > start && preset, 'Locate the actual camera selection, framing and storage preset');
  class Vector3 {
    constructor(...values) { this.values = values; }
    set(...values) { this.values = values; }
    copy(other) { this.values = [...other.values]; return this; }
    add(other) { this.values = this.values.map((value, index) => value + other.values[index]); return this; }
    setLength() { assert.fail('Interior camera must not be pushed through the garage wall to fit the screen'); }
  }
  const makeCamera = (fov) => ({ fov, position: new Vector3(), updateProjectionMatrix() {} });
  for (const [width, height] of [[1200, 800], [420, 800]]) {
    const interior = makeCamera(85);
    const ordinary = makeCamera(38);
    const context = {
      name: 'mudroom-storage', mudroomInteriorView: true, mudroomInspectionView: true, prepElevationView: false, exteriorElevation: false,
      viewport: { clientWidth: width, clientHeight: height }, mudroomInteriorCamera: interior, perspectiveCamera: ordinary, cooktopElevationCamera: {},
      controls: { target: new Vector3(), update() {} }, camera: null,
      preset: vm.runInNewContext(`(${preset[1]})`),
      THREE: { Vector3, MathUtils: { degToRad: (value) => value * Math.PI / 180, radToDeg: (value) => value * 180 / Math.PI } }
    };
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(context.camera, interior);
    assert.ok(Math.abs(interior.position.values[0] - 41.7) < 1e-9);
    assert.ok(Math.abs(interior.position.values[1] - 5.5) < 1e-9);
    assert.ok(Math.abs(interior.position.values[2] - 26.25) < 1e-9, 'Camera stays inside the garage-entry wall');
    assert.ok(Math.abs(Math.tan(interior.fov * Math.PI / 360) * Math.min(width / height, 1) - Math.tan(85 * Math.PI / 360)) < 1e-9);
    assert.equal(ordinary.fov, 38, 'Other room cameras retain their original field of view');
  }
});

test('all three mudroom views have tour starts clear of the actual enclosure parts', () => {
  const start = source.indexOf('    const starts = {', source.indexOf('  function startWalking('));
  const end = source.indexOf('\n    };', start);
  assert.ok(start >= 0 && end > start);
  const starts = vm.runInNewContext(`(() => { ${source.slice(start, end + 7)} return starts; })()`, {
    upstairs: { start: [16, 23] }, cooktopCenterZ: 16.95, kitchenCenterZ: 16.95, prepCounterZ: 9
  });
  const model = buildMudroom();
  const parts = model.all.filter((part) => part.w !== undefined).map(bounds).filter((b) => b.max[1] > 0.5 && b.min[1] < 5.4);
  for (const name of ['mudroom', 'mudroom-cubbies', 'mudroom-storage']) {
    const coordinates = starts[name];
    assert.equal(coordinates?.length, 4, `${name} has a tour start and look target`);
    assert.ok(coordinates.every(Number.isFinite));
    const [x, z] = coordinates;
    assert.ok(x >= 38.9 && x <= 42.9 && z >= 22 && z <= 26, 'Tour starts in the clear arrival zone');
    for (const b of parts) {
      const dx = Math.max(b.min[0] - x, 0, x - b.max[0]);
      const dz = Math.max(b.min[2] - z, 0, z - b.max[2]);
      assert.ok(dx * dx + dz * dz >= 0.25, 'Actual case parts leave room for the half-foot tour radius');
    }
  }
});
