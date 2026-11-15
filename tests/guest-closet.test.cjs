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
    windowTrim: {}, porcelain: {}, steel: { name: 'steel' }, guestClosetGlow: { name: 'Guest closet warm 2700K LED diffuser' },
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
  const start = source.indexOf('  // Guest walk-in closet built-ins.');
  const end = source.indexOf('  const guestCoats =', start);
  assert.ok(start >= 0 && end > start, 'The current closet built-ins and suite door geometry exist');
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

const north = suite.closet.z + 0.175, south = suite.closetSouthZ - 0.175, east = 31.2 - 0.175;
const westFace = suite.notch.x + suite.notch.w + 0.175;
const [westRun, tower] = suite.closets;
const crossingCenter = suite.closetDoor.x + suite.closetDoor.width / 2;
const overlap = (a, b) => ['X', 'Y', 'Z'].every(axis =>
  Math.min(a[`max${axis}`], b[`max${axis}`]) - Math.max(a[`min${axis}`], b[`min${axis}`]) > 1e-8);
const builtInNames = ['Guest west wardrobe built-in', 'Guest north-east drawer and folding tower', 'Guest laundry-wall upper shelves', 'Guest closet north-wall dressing mirror'];
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, message ?? `${a} != ${b}`);

function toggler(door) {
  const start = source.indexOf('    const operation = door.userData.interactiveHouseDoor;');
  const end = source.indexOf("    if (activeFloor === 'upstairs') buildWalkObstacles();", start);
  assert.ok(start >= 0 && end > start);
  const context = { door, THREE: { MathUtils: { degToRad: degrees => degrees * Math.PI / 180 } } };
  return () => vm.runInNewContext(`{${source.slice(start, end)}}`, context);
}

test('shared layout records standard closet boxes, centered west run and both datums', () => {
  close((south - north) * 12, 59.4251968503937);
  assert.deepEqual(westRun.sections.map(({ width }) => width * 12), [24, 30]);
  close(westRun.d * 12, 54); close(westRun.w * 12, 24);
  close((westRun.z - north) * 12, (59.4251968503937 - 54) / 2);
  close((south - westRun.z - westRun.d) * 12, (59.4251968503937 - 54) / 2);
  close((westRun.x - westFace) * 12, 0.75, 'West carcass sits off the retained base trim');
  close(tower.d * 12, 30); close(tower.w * 12, 24);
  close((east - tower.x - tower.w) * 12, 0.75); close((tower.z - north) * 12, 0.75);
  close(suite.closetDatums.shelf * 12, 84); close(suite.closetDatums.upper * 12, 96);
  assert.equal(suite.closetDoor.height * 12, 96, 'Upper datum aligns with the 96-inch pocket door heads');
});

test('west wardrobe: 24-inch long-hang and 30-inch double-hang sections with separate fillers', () => {
  const { roots, all } = build();
  const wardrobe = roots.find(root => root.name === 'Guest west wardrobe built-in');
  assert.ok(wardrobe);
  assert.equal(wardrobe.userData.standardSections, true);
  assert.equal(wardrobe.userData.separateFillers, true);
  const b = bounds(wardrobe);
  close(b.minX, westFace + 0.125 / 12, 'Only the luggage shelf scribes to 1/8 inch of west paint');
  close(b.maxX, westRun.x + 2, 'Front stays at the 24-inch clothing envelope');
  close(b.minZ, north + 0.125 / 12); close(b.maxZ, south - 0.125 / 12);
  close(b.maxY * 12, 96);
  const panels = meshes(wardrobe).filter(part => part.name === 'Guest wardrobe carcass panel').map(worldBounds).sort((p, q) => p.minZ - q.minZ);
  assert.equal(panels.length, 3);
  close((panels[1].minZ + panels[1].maxZ) / 2 - panels[0].minZ, 2, '24-inch long-hang section on centers');
  close(panels[2].maxZ - (panels[1].minZ + panels[1].maxZ) / 2, 2.5, '30-inch double-hang section on centers');
  for (const panel of panels) close(panel.maxY * 12, 95.25);
  const rods = all.filter(part => part.name === 'Guest wardrobe hanging rod');
  assert.deepEqual(rods.map(rod => Math.round(rod.userData.heightInches * 10) / 10).sort((p, q) => p - q), [40.5, 70, 81]);
  const lengths = rods.map(rod => { const r = worldBounds(rod); return (r.maxZ - r.minZ) * 12; });
  close(lengths.reduce((sum, length) => sum + length, 0), 79.5, 'Hanging rod rises from 67.5 to 79.5 inches');
  assert.deepEqual(lengths.map(length => Math.round(length * 1000) / 1000).sort((p, q) => p - q), [22.5, 28.5, 28.5]);
  for (const garment of all.filter(part => part.name === 'Guest wardrobe hanging clothes')) {
    const g = worldBounds(garment);
    assert.ok(g.minX >= westRun.x && g.maxX <= westRun.x + 2 && g.minY > 4 / 12, 'Clothing stays inside the 24-inch envelope above the deck');
  }
  assert.equal(all.filter(part => part.name === 'Guest wardrobe hanging clothes').length, 22);
  const lower = meshes(wardrobe).filter(part => part.name === 'Guest wardrobe separate lower end filler').map(worldBounds);
  const upper = meshes(wardrobe).filter(part => part.name === 'Guest wardrobe separate upper end scribe').map(worldBounds);
  assert.equal(lower.length, 2); assert.equal(upper.length, 2);
  close(Math.min(...lower.map(f => f.minZ)), north + 0.75 / 12, 'Lower filler stops at the retained base trim');
  close(Math.max(...upper.map(f => f.maxZ)), south - 0.125 / 12, 'Upper scribe leaves 1/8 inch to paint');
  for (const f of upper) close(f.minY * 12, 8.125);
  assert.equal(all.filter(part => part.name === 'Guest wardrobe 84-inch fixed shelf').length, 2);
  assert.equal(all.filter(part => part.name === 'Guest wardrobe continuous 96-inch luggage shelf').length, 1);
  assert.equal(all.filter(part => /Guest (west|east) end closet storage|30-inch shallow shelf module/.test(part.name ?? '')).length, 0);
});

test('north-east tower: four 21-inch-travel drawers, 36-inch folding top and four fixed shelves', () => {
  const { roots } = build();
  const unit = roots.find(root => root.name === 'Guest north-east drawer and folding tower');
  const b = bounds(unit);
  close((b.maxX - b.minX) * 12, 24 + 1.25, '24-inch box plus 1.25-inch bar pulls');
  close((b.maxZ - b.minZ) * 12, 30);
  close(b.maxY * 12, 95.25);
  const drawers = unit.children.filter(part => part.name === 'Guest tower full-extension drawer');
  assert.equal(drawers.length, 4);
  const shelves = meshes(unit).filter(part => part.name === 'Guest tower fixed shelf').map(part => worldBounds(part).maxY * 12).sort((p, q) => p - q);
  shelves.forEach((top, i) => close(top, [48, 60, 72, 84][i]));
  close(worldBounds(meshes(unit).find(part => part.name === 'Guest tower 36-inch folding top')).maxY * 12, 36);
  for (const drawer of drawers) {
    const toggle = toggler(drawer);
    assert.equal(drawer.userData.interactiveHouseDoor.open, false);
    toggle();
    assert.equal(drawer.userData.interactiveHouseDoor.open, true);
    close(drawer.position.x * 12, -21);
    toggle();
    assert.equal(drawer.position.x, 0, 'Drawers restore their default closed pose');
  }
});

test('built-ins fit the shell, keep fixing parts away from both pocket walls and never overlap', () => {
  const { roots } = build();
  const builtIns = builtInNames.map(name => roots.find(root => root.name === name));
  assert.ok(builtIns.every(Boolean));
  const stack = roots.find(root => /Guest Bosch/.test(root.name));
  const parts = builtIns.flatMap(meshes);
  for (const part of parts) {
    const b = worldBounds(part);
    assert.ok(b.minX >= westFace - 1e-8 && b.maxX <= east + 1e-8 && b.minZ >= north - 1e-8 && b.maxZ <= south + 1e-8, `${part.name} stays inside finished paint faces`);
    assert.ok(b.minY >= -1e-8 && b.maxY <= 8 + 1e-8, `${part.name} stays at or below the 96-inch datum`);
  }
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) assert.ok(!overlap(worldBounds(parts[i]), worldBounds(parts[j])), `${parts[i].name} / ${parts[j].name}`);
    for (const machine of meshes(stack)) assert.ok(!overlap(worldBounds(parts[i]), worldBounds(machine)), `${parts[i].name} clears ${machine.name}`);
  }
  // Fixing members (carcass panels, tower sides, cleats) stay 1 inch off each pocket wall over its cavity run.
  const fixing = parts.filter(part => /carcass panel|side panel|cleat/.test(part.name));
  for (const door of [suite.bathroomDoor, suite.closetDoor]) {
    const face = door === suite.bathroomDoor ? north : south;
    for (const part of fixing) {
      const b = worldBounds(part);
      if (b.maxX <= door.pocket.x || b.minX >= door.pocket.x + door.pocket.w) continue;
      assert.ok(Math.min(Math.abs(b.minZ - face), Math.abs(b.maxZ - face)) >= 1 / 12 - 1e-8, `${part.name} keeps fasteners off the ${door === suite.bathroomDoor ? 'bath' : 'bedroom'} pocket wall`);
    }
  }
  const above = worldBounds(meshes(roots.find(root => root.name === 'Guest laundry-wall upper shelves')).find(part => part.name === 'Guest laundry 84-inch shelf over dryer'));
  assert.ok((above.minY - bounds(stack).maxY) * 12 >= 6.25, 'Shelf exceeds the 6.25-inch published top allowance');
  assert.ok(Math.abs((above.minY - bounds(stack).maxY) * 12 - 15.44) < 1e-6, 'Measured dryer top (on its 0.06-inch leveling datum) to shelf underside');
  const leds = parts.filter(part => part.name === 'Guest closet warm LED shelf strip');
  assert.equal(leds.length, 4);
  for (const led of leds) assert.equal(led.material.name, 'Guest closet warm 2700K LED diffuser');
  const mirror = bounds(roots.find(root => root.name === 'Guest closet north-wall dressing mirror'));
  assert.ok(mirror.minX > suite.bathroomDoor.x + suite.bathroomDoor.width + 2.5 / 12 && mirror.maxX < tower.x, 'Mirror sits on the solid wall between casing and tower');
});

test('straight pocket-to-pocket crossing keeps a centered 36-inch band clear with drawers and laundry doors open', () => {
  const { roots, all } = build();
  const builtIns = builtInNames.map(name => roots.find(root => root.name === name));
  const stack = roots.find(root => /Guest Bosch/.test(root.name));
  const band = { minX: crossingCenter - 1.5, maxX: crossingCenter + 1.5, minY: 0, maxY: 8, minZ: north, maxZ: south };
  const westFront = westRun.x + 2;
  const stackFront = bounds(stack).minX;
  close((stackFront - westFront) * 12, 66.35, 'Closed walkway: west clothing envelope to stack front');
  close((tower.x - westFront) * 12, 70.6, 'Closed walkway: west clothing envelope to tower front');
  const drawers = all.filter(part => part.name === 'Guest tower full-extension drawer');
  for (const drawer of drawers) drawer.position.x = drawer.userData.interactiveHouseDoor.openCenterX;
  const hinges = all.filter(part => /Guest laundry .* door hinge/.test(part.name));
  let nearestEast = Infinity;
  for (let degrees = 0; degrees <= 90; degrees += 5) {
    for (const hinge of hinges) hinge.rotation.y = -degrees * Math.PI / 180;
    const parts = builtIns.concat(stack).flatMap(meshes).map(worldBounds);
    for (const part of parts) {
      assert.ok(!overlap(part, band), `Nothing enters the 36-inch crossing band at ${degrees} degrees`);
      if (part.minX > crossingCenter) nearestEast = Math.min(nearestEast, part.minX);
    }
    for (const hinge of hinges) for (const door of meshes(hinge)) for (const drawer of drawers.flatMap(meshes))
      assert.ok(!overlap(worldBounds(door), worldBounds(drawer)), 'Open drawers and laundry doors can operate together');
  }
  const westNearest = Math.max(...builtIns.flatMap(meshes).map(worldBounds).filter(b => b.maxX < crossingCenter).map(b => b.maxX));
  close(westNearest, westFront);
  assert.ok((nearestEast - crossingCenter) * 2 * 12 > 36, 'East-side projections clear the centered crossing');
  assert.ok((nearestEast - westNearest) * 12 > 48, `Open-front clear width ${(nearestEast - westNearest) * 12}`);
  assert.ok((crossingCenter - westNearest) * 2 * 12 > 36, 'West-side projections clear the centered crossing');
  for (const drawer of drawers) drawer.position.x = 0;
  for (const hinge of hinges) hinge.rotation.y = 0;
});

test('owner-authorized south-east laundry stack is retained and its doors sweep clear of storage', () => {
  const { roots, all } = build();
  const stack = roots.find(root => /Guest Bosch/.test(root.name));
  assert.equal(stack.rotation.y, -Math.PI / 2);
  const fixed = builtInNames.flatMap(name => meshes(roots.find(root => root.name === name))).map(worldBounds);
  for (const part of meshes(stack)) {
    const b = worldBounds(part);
    assert.ok(b.minZ >= north - 1e-8 && b.maxZ <= south + 1e-8, `${part.name} clears partition paint`);
    assert.ok(b.maxX <= east - 0.125 / 12 + 1e-8, `${part.name} clears east paint`);
  }
  const rear = east - 3 / 12;
  const openFront = rear - 43.5 / 12;
  close(bounds(stack).minX, rear - 26 / 12);
  close((tower.z + tower.d - north) * 12, 30.75);
  close(((south - 1 / 12 - 23.5 / 12) - (tower.z + tower.d)) * 12, 4.175196850393704, 'Tower/stack side gap');
  for (const hinge of all.filter(part => /Guest laundry .* door hinge/.test(part.name))) {
    const toggle = toggler(hinge);
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
        assert.ok(b.minZ >= north && b.maxZ <= south, `${part.name} clears shell through sweep ${degrees}`);
        for (const f of fixed) assert.ok(!overlap(b, f), `${part.name} clears closet built-ins through sweep ${degrees}`);
      }
    }
    hinge.rotation.y = 0;
  }
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
  for (const opening of [suite.closetDoor, suite.bathroomDoor])
  {
    close(opening.x, 23.55, 'Both openings move 9 inches west and remain aligned');
    assert.ok(opening.x - (3.5 + 0.125) / 12 > westRun.x + westRun.w, 'West casing clears the wardrobe footprint');
  }
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
