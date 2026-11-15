'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const suite = require('../assets/js/floor-plan-ground.js').getGuestSuiteLayout();
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');

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
    windowTrim: {}, porcelain: {},
    furnishing(name, x, z, rotation = 0, elevation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, elevation, z);
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
  assert.ok(start >= 0 && end > start, 'The current end storage and suite door geometry exists');
  const doorStart = source.indexOf('  function singlePanelDoor(');
  const doorEnd = source.indexOf('  function shakerFront(', doorStart);
  assert.ok(doorStart >= 0 && doorEnd > doorStart);
  vm.runInNewContext(source.slice(doorStart, doorEnd), context);
  const bedroomStart = source.indexOf('  const guestBedroomEntry =');
  assert.ok(bedroomStart >= 0 && start > bedroomStart);
  vm.runInNewContext(source.slice(bedroomStart, start), context);
  vm.runInNewContext(source.slice(start, end), context);
  const all = roots.flatMap(root => {
    const descendants = [];
    root.traverse(part => descendants.push(part));
    return descendants;
  });
  return { roots, all, context };
}

test('guest bedroom closed leaf is centered in its opening on the wall plane', () => {
  const model = build();
  const leaf = model.all.find(part => part.name === 'Guest bedroom white single-panel door');
  assert.ok(leaf);
  const b = bounds(leaf), opening = suite.bedroomDoor;
  assert.ok(Math.abs((b.minZ - opening.z) * 12 - 0.24) < 1e-8);
  assert.ok(Math.abs((opening.z + opening.width - b.maxZ) * 12 - 0.24) < 1e-8);
  assert.ok(Math.abs((b.minX + b.maxX) / 2 - opening.x) < 1e-8);
  assert.ok(Math.abs(b.maxY * 12 - 95.76) < 1e-8);
});

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

function bounds(root)
{
  const parts = meshes(root).map(worldBounds);
  return Object.fromEntries(['X', 'Y', 'Z'].flatMap(axis => [
    [`min${axis}`, Math.min(...parts.map(part => part[`min${axis}`]))],
    [`max${axis}`, Math.max(...parts.map(part => part[`max${axis}`]))]
  ]));
}

function buildPocketWalls(context)
{
  class Vector2
  {
    constructor(x, y) { Object.assign(this, { x, y }); }
    clone() { return new Vector2(this.x, this.y); }
    addScaledVector(other, scale) { this.x += other.x * scale; this.y += other.y * scale; return this; }
  }
  Object.assign(context, {
    THREE: { ...context.THREE, Vector2 }, scene: new Group(), shell: new Group(),
    walls: [], windowWallDatums: [], baseTrimSections: [], wallMaterial: {},
    casingSideWidth: 2.5 / 12, casingReveal: 0.125 / 12, ceilingHeight: 9,
    groundFrontWallZ: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ,
    getGroundFloorDefaultPlan: require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan,
    openingCasing() {}
  });
  const start = source.indexOf('  function wall(');
  const end = source.indexOf('  function joinWallCorners()', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const mapStart = source.indexOf('    ...getGroundFloorDefaultPlan().walls.filter(');
  const mapEnd = source.indexOf('\n    [31.2, 34.6', mapStart);
  assert.ok(mapStart >= 0 && mapEnd > mapStart);
  const expression = source.slice(mapStart, mapEnd).trim().slice(3, -1);
  vm.runInNewContext(`segments = ${expression}`, context);
  const segments = context.segments.filter(segment => segment[10].pocket);
  assert.equal(segments.length, 2, 'Both shared room partitions receive their pocket cavity');
  for (const segment of segments) context.wall(...segment);
  return context.walls;
}

test('west 48 x 24-inch storage retains long and double-short hanging; east becomes laundry', () => {
  const { roots, all } = build();
  const compartments = roots.filter(root => /Guest (west|east) end closet storage/.test(root.name));
  assert.equal(compartments.length, 1);
  for (const [index, root] of compartments.entries()) {
    const expected = suite.closets[index];
    assert.equal(root.userData.storageType, 'Walk-through end storage');
    assert.equal(root.userData.depthInches, 24);
    assert.equal(root.userData.widthInches, 48);
    assert.equal(root.userData.heightInches, 84);
    assert.equal(root.userData.separateFillers, true);
    const contents = meshes(root);
    assert.ok(contents.length > 0);
    for (const part of contents) {
      const b = worldBounds(part);
      const scribe = part.name === 'Guest upper shelf separate rear scribe' ? 0.0625 - 0.125 / 12 : 0;
      assert.ok(b.minX >= expected.x - scribe - 1e-8 && b.maxX <= expected.x + expected.w + scribe + 1e-8, `${root.name}: ${part.name} stays within its standard cabinet envelope and separate rear scribes`);
      assert.ok(b.minZ >= suite.closet.z + 0.175 - 1e-8 && b.maxZ <= suite.closetSouthZ - 0.175 + 1e-8, `${root.name}: ${part.name} stays within finished trim faces`);
      assert.ok(b.minY >= -1e-8 && b.maxY <= 7.5, `${part.name} stays below the modeled ceiling`);
    }
  }
  assert.equal(all.filter(part => part.name === 'Guest continuous end-storage hanging rod').length, 3);
  assert.equal(all.filter(part => part.name === 'Guest end-storage separate top filler').length, 1);
  assert.equal(all.filter(part => part.name === 'Guest retained hanging clothes').length, 15);
  assert.equal(all.filter(part => part.name === 'Guest walk-in closet fittings').length, 0);
  assert.equal(all.filter(part => /Guest closet connected diagonal corner shelf|Guest closet pull-out drawer/.test(part.name)).length, 0);
});

test('shelf extensions reclaim both wall ends while preserving hanging bays, trim and the occupied aisle', () => {
  const { roots, all } = build();
  const storage = roots.filter(root => /Guest (west|east) end closet storage/.test(root.name));
  assert.equal(all.filter(part => part.name === 'Guest upper shelf wall extension').length, 4);
  assert.equal(all.filter(part => part.name === 'Guest lower shelf trim-reserved extension').length, 2);
  assert.equal(all.filter(part => part.name === 'Guest upper shelf separate rear scribe').length, 2);
  for (const root of storage) {
    const parts = meshes(root);
    for (const [y, reserve] of [[7, 0.125 / 12], [0.2, 0.75 / 12]]) {
      const shelves = parts.filter(part => part.position.y === y);
      const measured = shelves.map(worldBounds);
      assert.ok(Math.abs(Math.min(...measured.map(b => b.minZ)) - (suite.closet.z + 0.175 + reserve)) < 1e-8);
      assert.ok(Math.abs(Math.max(...measured.map(b => b.maxZ)) - (suite.closetSouthZ - 0.175 - reserve)) < 1e-8);
      const center = worldBounds(parts.find(part => part.name === 'Guest end-storage shelf' && part.position.y === y));
      const extensions = shelves.filter(part => /extension/.test(part.name)).map(worldBounds).sort((a, b) => a.minZ - b.minZ);
      assert.ok(Math.abs(extensions[0].maxZ - center.minZ) < 1e-8, 'North extension joins, not overlaps, standard shelf');
      assert.ok(Math.abs(extensions[1].minZ - center.maxZ) < 1e-8, 'South extension joins standard shelf');
    }
  }
  for (const rod of all.filter(part => part.name === 'Guest continuous end-storage hanging rod')) {
    assert.ok(Math.abs((worldBounds(rod).maxZ - worldBounds(rod).minZ) - 1.875) < 1e-8);
  }
});

test('real east-end stack and shelf constituents fit shell, clothing and occupied use through both door sweeps', () => {
  const { roots, all } = build();
  const stack = roots.find(root => /Guest Bosch/.test(root.name));
  const shelf = roots.find(root => /30-inch shallow shelf module/.test(root.name));
  const west = roots.find(root => /Guest west end closet storage/.test(root.name));
  const overlap = (a, b) => ['X', 'Y', 'Z'].every(axis =>
    Math.min(a[`max${axis}`], b[`max${axis}`]) - Math.max(a[`min${axis}`], b[`min${axis}`]) > 1e-8);
  assert.equal(stack.rotation.y, -Math.PI / 2);
  assert.equal(all.filter(part => part.name === 'Guest laundry fixed shelf').length, 6);
  const fixed = meshes(shelf).concat(meshes(west)).map(worldBounds);
  const north = suite.closet.z + 0.175, south = suite.closetSouthZ - 0.175, east = 31.2 - 0.175;
  for (const part of meshes(stack).concat(meshes(shelf))) {
    const b = worldBounds(part);
    assert.ok(b.minZ >= north - 1e-8 && b.maxZ <= south + 1e-8, `${part.name} clears partition paint`);
    assert.ok(b.maxX <= east - 0.125 / 12 + 1e-8, `${part.name} clears east paint and upper scribe`);
    for (const f of meshes(west).map(worldBounds)) assert.ok(!overlap(b, f));
  }
  const westFront = suite.closets[0].x + 2; // full 24-inch clothing envelope, not sparse garment bounds
  const rear = east - 3 / 12;
  const closedFront = rear - 26 / 12;
  assert.ok(Math.abs((closedFront - westFront) * 12 - 66.35) < 1e-6);
  const openFront = rear - 43.5 / 12;
  assert.ok((openFront - westFront) * 12 > 48, 'More than 48 inches remains across open door to full clothes envelope');
  // 30 x 30 occupied loading square is outside the complete published sweep,
  // south of the shelf module. It is not a universal code clearance.
  const operator = { minX: openFront - 2.5, maxX: openFront, minY: 0.1, maxY: 6,
    minZ: south - 31 / 12, maxZ: south - 1 / 12 };
  assert.ok(operator.minX > westFront);
  assert.ok(operator.maxZ < south);
  for (const f of fixed) assert.ok(!overlap(operator, f), 'Loading occupancy clears shelf and clothing');
  // Loading occupies the ordinary door-to-door route: do not claim passing.
  assert.ok((closedFront - operator.maxX) * 12 < 30, 'Loading and passing are sequential, not simultaneous');
  for (const hinge of all.filter(part => /Guest laundry .* door hinge/.test(part.name))) {
    const start = source.indexOf('    const operation = door.userData.interactiveHouseDoor;');
    const end = source.indexOf("    if (activeFloor === 'upstairs') buildWalkObstacles();", start);
    assert.ok(start >= 0 && end > start);
    const toggleContext = { door: hinge, THREE: { MathUtils: { degToRad: degrees => degrees * Math.PI / 180 } } };
    const toggle = () => vm.runInNewContext(`{${source.slice(start, end)}}`, toggleContext);
    assert.equal(hinge.userData.interactiveHouseDoor.openAngleDegrees, 0);
    toggle();
    assert.ok(Math.abs(hinge.rotation.y + Math.PI / 2) < 1e-8, 'Existing click handler opens laundry door to 90 degrees');
    toggle();
    assert.equal(hinge.rotation.y, 0, 'Existing click handler restores closed pose');
    for (let degrees = 0; degrees <= 180; degrees += 5) {
      hinge.rotation.y = -degrees * Math.PI / 180;
      for (const part of meshes(hinge)) {
        const b = worldBounds(part);
        assert.ok(b.minX >= openFront - 1e-8, `${part.name} stays inside published open-depth reserve`);
        assert.ok(b.minZ >= north && b.maxZ <= south, `${part.name} clears shell through sweep ${degrees}: ${JSON.stringify(b)} vs ${north}/${south}`);
        for (const f of fixed) assert.ok(!overlap(b, f), `${part.name} clears storage through sweep`);
      }
    }
    hinge.rotation.y = 0;
  }
  // Shelf retrieval uses a separate 30-inch zone, never the appliance body.
  const sb = bounds(shelf);
  const retrieval = { minX: sb.minX - 2.5, maxX: sb.minX, minY: 0.1, maxY: 6, minZ: sb.minZ, maxZ: sb.maxZ };
  for (const part of meshes(stack)) assert.ok(!overlap(retrieval, worldBounds(part)));
  assert.ok(retrieval.minX > westFront);
  assert.ok((south - 24.5 / 12) - sb.maxZ > 4 / 12, 'Shelf module is separated from stack side');
  const scribe = meshes(shelf).find(part => /separate rear scribe/.test(part.name));
  assert.ok(worldBounds(scribe).minY > 8 / 12 + 0.005, 'Rear scribe clears retained 8-inch baseboard');
  for (const name of ['washer', 'dryer']) {
    const glass = all.find(part => part.name === `Guest laundry ${name} door glass`);
    const rim = all.find(part => part.name === `Guest laundry ${name} door ring`);
    assert.ok(worldBounds(glass).minX < worldBounds(rim).minX, 'Glazing is visible in front of ring, not buried');
    const display = all.find(part => part.name === `Guest laundry ${name} control display`);
    const fascia = all.find(part => part.name === `Guest laundry ${name} control fascia`);
    assert.ok(worldBounds(display).minX < worldBounds(fascia).minX, 'Control display is not buried');
  }
});

test('bedroom and bath use 30 x 96 pocket entries retracting inside real wall cavities, default closed', () =>
{
  const { roots, context } = build();
  const walls = buildPocketWalls(context);
  const wallBounds = walls.map(worldBounds);
  assert.equal(walls.filter(part => part.name === 'Guest pocket door wall skin').length, 4);
  for (const [name, opening, sign] of [
    ['Guest walk-through closet pocket door', suite.closetDoor, 1],
    ['Guest bathroom pocket entry from closet', suite.bathroomDoor, -1]
  ])
  {
    const door = roots.find(root => root.name === name);
    assert.ok(door);
    assert.equal(door.userData.doorType, 'pocket');
    assert.equal(door.userData.nominalWidthInches, 30);
    assert.equal(door.userData.nominalHeightInches ?? door.userData.heightInches, 96);
    assert.equal(door.position.z, opening.z, 'Leaf is centered within the partition, not on its surface');
    const data = door.userData.interactiveHouseDoor;
    assert.equal(data.operation, 'sliding');
    assert.equal(data.open, false);
    assert.equal(Math.sign(data.openCenterX - data.closedCenterX), sign);
    const b = bounds(door);
    assert.ok(Math.abs((b.maxY - b.minY) * 12 - 95.52) < 1e-8, 'Nominal 96-in leaf has 0.48-in modeled floor/head fitting allowance');
    for (let step = 0; step <= 20; step++)
    {
      door.position.x = data.closedCenterX + (data.openCenterX - data.closedCenterX) * step / 20;
      for (const part of meshes(door))
      {
        const partBounds = worldBounds(part);
        assert.ok(partBounds.minZ > opening.z - opening.pocket.clearDepth / 2);
        assert.ok(partBounds.maxZ < opening.z + opening.pocket.clearDepth / 2, 'Leaf and flush pulls clear both cavity skins');
        for (const wall of wallBounds)
        {
          assert.ok(!['X', 'Y', 'Z'].every(axis => Math.min(partBounds[`max${axis}`], wall[`max${axis}`]) - Math.max(partBounds[`min${axis}`], wall[`min${axis}`]) > 1e-8),
            `${name}: ${part.name} clears all wall constituents throughout travel`);
        }
      }
    }
    door.position.x = data.openCenterX;
    const open = bounds(door);
    assert.ok(sign > 0 ? open.minX > suite.closetDoor.x + suite.closetDoor.width : open.maxX < suite.bathroomDoor.x + 1e-8);
    assert.ok(open.minX >= opening.pocket.x && open.maxX <= opening.pocket.x + opening.pocket.w, 'Fully open leaf is contained in the wall pocket');
    assert.ok(open.maxY < opening.pocket.height);
    door.position.x = data.closedCenterX;
    const toggleStart = source.indexOf("    if (operation.operation === 'sliding') {");
    const toggleEnd = source.indexOf("    } else if (operation.operation === 'overhead')", toggleStart);
    assert.ok(toggleStart >= 0 && toggleEnd > toggleStart);
    const toggle = source.slice(toggleStart, toggleEnd) + '\n    }';
    const edgePull = door.children.find(part => part.userData.pocketEdgePull);
    assert.ok(edgePull, 'An edge pull keeps a fully pocketed leaf retrievable');
    vm.runInNewContext(toggle, { door, operation: data });
    assert.equal(data.open, true);
    assert.equal(edgePull.position.x, edgePull.userData.extendedX);
    const pull = worldBounds(edgePull);
    assert.ok(sign > 0 ? pull.minX < opening.x + opening.width : pull.maxX > opening.x, 'Deployed edge pull remains exposed in the opening');
    const projection = sign > 0 ? opening.x + opening.width - pull.minX : pull.maxX - opening.x;
    assert.ok(Math.abs((opening.width - projection) * 12 - 29.34) < 1e-8,
      'Actual deployed edge pull leaves29.34 inches of nominal30-in opening; not certified passage');
    for (const wall of wallBounds)
      assert.ok(!['X', 'Y', 'Z'].every(axis => Math.min(pull[`max${axis}`], wall[`max${axis}`]) - Math.max(pull[`min${axis}`], wall[`min${axis}`]) > 1e-8), 'Deployed edge pull clears wall skins and jambs');
    vm.runInNewContext(toggle, { door, operation: data });
    assert.equal(data.open, false);
    assert.equal(door.position.x, data.closedCenterX);
    assert.equal(edgePull.position.x, edgePull.userData.retractedX);
  }
  assert.equal(roots.filter(root => /sliding track/.test(root.name)).length, 0, 'No exposed surface tracks remain');
  assert.equal(roots.filter(root => /single-leaf closet door|paired-leaf closet doors/.test(root.name)).length, 0);
  assert.ok(!source.includes('Guest walk-in closet fittings'));
});
