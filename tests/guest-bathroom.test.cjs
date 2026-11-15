'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const suite = require('../assets/js/floor-plan-ground.js').getGuestSuiteLayout();
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');

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
    guestVanityStone: {}, oak: {}, windowTrim: {}, black: {}, linen: {}, cushion: {}, guestClosetGlow: {},
    groundFrontWallZ: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ,
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
  const functionsEnd = source.indexOf('  const powderBasin', functionsStart);
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
  const towelStart = source.indexOf('  const guestTowel =');
  const towelEnd = source.indexOf("  toilet('Guest bathroom toilet'", towelStart);
  assert.ok(towelStart >= 0 && towelEnd > towelStart);
  vm.runInNewContext(source.slice(towelStart, towelEnd), context);
  const storageStart = source.indexOf('  // Guest walk-in closet built-ins.');
  const storageEnd = source.indexOf('  const closetOpening =', storageStart);
  assert.ok(storageStart >= 0 && storageEnd > storageStart);
  vm.runInNewContext(source.slice(storageStart, storageEnd), context);
  const sliderStart = source.indexOf('  const closetOpening = guestSuite.closetDoor;');
  vm.runInNewContext(source.slice(sliderStart, doorStart), context);
  const cabinetStart = source.indexOf('  function cabinet(parent,');
  const cabinetEnd = source.indexOf('  const prep = furnishing(', cabinetStart);
  assert.ok(cabinetStart >= 0 && cabinetEnd > cabinetStart);
  vm.runInNewContext(source.slice(cabinetStart, cabinetEnd), context);
  const bedStart = source.indexOf('  const bedroomBedWidth =');
  const bedEnd = source.indexOf('  const guestBedroomEntry =', bedStart);
  assert.ok(bedStart >= 0 && bedEnd > bedStart);
  vm.runInNewContext(source.slice(bedStart, bedEnd), context);
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

function intersectsCasing(mesh, bounds) {
  const { width, depth } = mesh.geometry.parameters;
  const polygon = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]]
    .map(([x, z]) => {
      for (let node = mesh; node; node = node.parent) {
        x *= node.scale.x; z *= node.scale.z;
        const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y);
        [x, z] = [node.position.x + c * x + s * z, node.position.z - s * x + c * z];
      }
      return [x, z];
    });
  const board = [[bounds.minX, bounds.minZ], [bounds.maxX, bounds.minZ], [bounds.maxX, bounds.maxZ], [bounds.minX, bounds.maxZ]];
  for (const shape of [polygon, board]) for (let i = 0; i < shape.length; i++) {
    const [x, z] = shape[i], [nx, nz] = shape[(i + 1) % shape.length], axis = [z - nz, nx - x];
    const project = points => points.map(point => point[0] * axis[0] + point[1] * axis[1]);
    const a = project(polygon), b = project(board);
    if (Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b)) <= 1e-8) return false;
  }
  return true;
}

test('revised guest bath retains west wall-to-wall built-in shower, north-center 48 vanity and east private WC', () => {
  const model = build();
  const shower = model.find('Guest bathroom shower');
  const toilet = model.find('Guest bathroom toilet');
  const vanity = model.find('Guest bathroom vanity');
  assert.ok(shower && toilet && vanity);
  assert.equal(shower.userData.clearWidthInches, 36);
  close(shower.userData.clearDepthInches, 53.4);
  assert.equal(shower.userData.doorOpeningInches, 30);
  assert.equal(vanity.userData.widthInches, 48);
  assert.equal(vanity.userData.depthInches, 18);
  assert.equal(vanity.userData.basinCount, 1);
  assert.ok(suite.vanity.x < suite.toilet.x, 'Vanity is west of the private WC');
  const showerBounds = worldBounds(meshes(shower)[0]);
  close(showerBounds.minX, suite.shower.x);
  assert.ok(worldBounds(meshes(shower)[0]).maxX < suite.toilet.x - 1);

  const toiletBounds = meshes(toilet).map(worldBounds).reduce(union);
  const vanityBounds = meshes(vanity).map(worldBounds).reduce(union);
  close(suite.toilet.x, 29.525);
  close(suite.toilet.z, suite.bathroom.z + 1.275);
  close(suite.vanity.x, 25.1);
  close(suite.vanity.z, suite.bathroom.z + 1.05);
  close(toiletBounds.minZ, suite.bathroom.z + 0.175);
  assert.ok(suite.toilet.x > suite.bathroom.x + suite.shower.w, 'Toilet is beyond the west shower zone');
  assert.ok(suite.toilet.z < suite.bathroom.z + suite.bathroom.d / 2, 'Toilet is north of bath center');
  assert.ok(toiletBounds.maxZ < suite.bathroomDoor.z - 0.175, 'Toilet remains north of the finished south wall');
  assert.ok((suite.bathroomDoor.z - 0.175 - toiletBounds.maxZ) * 12 >= 30, 'Modeled southward floor approach before the finished wall is at least 30 in');
  close((suite.bathroomDoor.z - 0.175 - toiletBounds.maxZ) * 12, 32.424);
  for (const toiletPart of meshes(toilet)) {
    const toiletPartBounds = worldBounds(toiletPart);
    for (const vanityPart of meshes(vanity)) {
      assert.equal(intersectsXZ(toiletPartBounds, worldBounds(vanityPart)), false,
        `toilet part does not geometrically overlap vanity part ${vanityPart.name}`);
    }
  }
  assert.ok(vanityBounds.minX >= suite.bathroom.x, 'Vanity remains within the full-width bath');
  close((31.025 - (suite.wc.x + 0.175)) * 12, 36);
  close((suite.wc.d - 0.35) * 12, 55.8);
  close(showerBounds.maxX - showerBounds.minX - 0.2, 3);
  close(showerBounds.maxZ - showerBounds.minZ - 0.2, 4.45);
  close(showerBounds.minZ, suite.bathroom.z + 0.175, 'Shower starts at the north paint face');
  close(showerBounds.maxZ, suite.bathroomDoor.z - 0.175, 'Built-in shower reaches the south paint face with no floor strip');
  const parts = shower.children.map(part => part.name);
  for (const name of ['Guest shower west tile', 'Guest shower north tile', 'Guest shower south tile', 'Guest shower fixed northeast glass']) assert.ok(parts.includes(name), name);
  assert.equal(parts.some(name => /south splash glass|southeast glass/.test(name)), false, 'No glass against the south wall');
  const southTile = worldBounds(meshes(shower).find(part => part.name === 'Guest shower south tile'));
  close(southTile.maxZ, suite.bathroomDoor.z - 0.175);
  const glass = worldBounds(meshes(shower).find(part => part.name === 'Guest shower fixed northeast glass'));
  assert.ok((southTile.minZ - glass.maxZ) * 12 >= 30, 'East entry stays at least 30 in between glass and south tile');
  assert.ok(vanityBounds.maxX < suite.wc.x - 0.175);
});

test('private WC solid door is 30 x 96 nominal and sampled inward sweep clears actual fixture parts', () => {
  const model = build();
  const door = model.find('Guest private WC inward sound-door study');
  assert.ok(door);
  assert.equal(door.userData.nominalWidthInches, 30);
  assert.equal(door.userData.nominalHeightInches, 96);
  assert.equal(door.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  const towel = model.find('Guest bathroom wall-mounted towel hook');
  close(towel.position.z, suite.bathroom.z + 3.45);
  close(meshes(towel).find(p => p.name === 'Guest bathroom hanging towel').geometry.parameters.depth * 12, 16);
  const fixtures = ['Guest bathroom toilet', 'Guest bathroom vanity', 'Guest bathroom shower', 'Guest bathroom wall-mounted towel hook']
    .map(name => meshes(model.find(name)).map(worldBounds));
  assert.equal(model.find('Guest WC offset door lining extensions'), undefined);
  const frameParts = meshes(model.find('Guest WC wall-fitted door lining'));
  assert.equal(frameParts.length, 3);
  for (const part of frameParts) {
    const frame = worldBounds(part);
    close(frame.minX, suite.wc.x - 0.175);
    close(frame.maxX, suite.wc.x + 0.175);
    for (const group of fixtures) for (const fixture of group) {
      const overlapY = Math.min(frame.maxY, fixture.maxY) - Math.max(frame.minY, fixture.minY);
      assert.ok(overlapY <= 1e-6 || !intersectsXZ(frame, fixture), `${part.name} clears fixtures`);
    }
  }
  const movingParts = meshes(door);
  const leaf = movingParts.find(mesh => Math.abs(mesh.geometry.parameters.width - 2.46) < 1e-9);
  assert.ok(leaf, 'The actual 29.52-inch leaf is present');
  const original = door.rotation.y;
  const closed = worldBounds(leaf);
  close(closed.minX, suite.wc.x + 0.175);
  close((closed.minZ - suite.wcDoor.z) * 12, 0.24);
  close((suite.wcDoor.z + suite.wcDoor.width - closed.maxZ) * 12, 0.24);
  const jambWalls = [
    { minX: suite.wc.x - 0.175, maxX: suite.wc.x + 0.175, minZ: suite.wc.z, maxZ: suite.wcDoor.z },
    { minX: suite.wc.x - 0.175, maxX: suite.wc.x + 0.175, minZ: suite.wcDoor.z + suite.wcDoor.width, maxZ: suite.bathroomDoor.z }
  ];
  const casingReveal = 0.125 / 12;
  const casingWidth = 3.5 / 12;
  const casing = [-1, 1].flatMap(side => [
    { minX: suite.wc.x + side * 0.175 - (side < 0 ? 0.0625 : 0), maxX: suite.wc.x + side * 0.175 + (side > 0 ? 0.0625 : 0),
      minZ: suite.wcDoor.z - casingReveal - casingWidth, maxZ: suite.wcDoor.z - casingReveal },
    { minX: suite.wc.x + side * 0.175 - (side < 0 ? 0.0625 : 0), maxX: suite.wc.x + side * 0.175 + (side > 0 ? 0.0625 : 0),
      minZ: suite.wcDoor.z + suite.wcDoor.width + casingReveal, maxZ: suite.wcDoor.z + suite.wcDoor.width + casingReveal + casingWidth }
  ]);
  const minimum = { west: Infinity, east: Infinity, south: Infinity };
  for (let degrees = 0; degrees <= 90; degrees += 1) {
    door.rotation.y = Math.PI / 2 - degrees * Math.PI / 180;
    for (const movingPart of movingParts) {
      const bounds = worldBounds(movingPart);
      for (const wall of jambWalls) assert.equal(intersectsXZ(bounds, wall), false, `door clears WC partition at ${degrees} degrees`);
      for (const [index, board] of casing.entries()) assert.equal(intersectsCasing(movingPart, board), false, `${movingPart.name} clears WC casing ${index} at ${degrees} degrees`);
      for (const part of frameParts) {
        const frame = worldBounds(part);
        const overlapY = Math.min(bounds.maxY, frame.maxY) - Math.max(bounds.minY, frame.minY);
        assert.ok(overlapY <= 1e-6 || !intersectsCasing(movingPart, frame), `door clears ${part.name} at ${degrees} degrees`);
      }
      for (const fixtureParts of fixtures) {
        for (const fixture of fixtureParts) assert.equal(intersectsXZ(bounds, fixture), false, `door leaf/handle clears fixtures at ${degrees} degrees`);
      }
      if (movingPart === leaf) assert.ok(bounds.minX >= suite.wc.x + 0.175 - 1e-7, 'Leaf remains inside WC west paint');
      assert.ok(bounds.maxX <= 31.025, 'Leaf and hardware clear east paint');
      assert.ok(bounds.maxZ <= suite.bathroomDoor.z - 0.175, 'Leaf and hardware clear south paint including fully open knobs');
      minimum.west = Math.min(minimum.west, (bounds.minX - suite.wc.x - 0.175) * 12);
      minimum.east = Math.min(minimum.east, (31.025 - bounds.maxX) * 12);
      minimum.south = Math.min(minimum.south, (suite.bathroomDoor.z - 0.175 - bounds.maxZ) * 12);
    }
  }
  close(minimum.west, -1.3525); close(minimum.east, 4.8325); close(minimum.south, 1.26);
  // At 90 degrees the privacy knobs, not the leaf, bound this nominal30-in threshold.
  close((Math.min(...movingParts.map(p => worldBounds(p).minZ)) - suite.wcDoor.z) * 12, 26.76);
  door.rotation.y = original;
});

test('queen, two actual cabinet nightstands, west TV and fixed front bank remain full-size', () => {
  const model = build();
  const bed = model.find('Article Lenia queen bed');
  const b = meshes(bed).map(worldBounds).reduce(union);
  close((b.maxX - b.minX) * 12, 82.75);
  close((b.maxZ - b.minZ) * 12, 63.5);
  close(bed.rotation.y, -Math.PI / 2);
  const nights = model.roots.filter(root => root.name === 'Bedroom nightstand');
  assert.equal(nights.length, 2);
  for (const root of [bed, ...nights]) {
    const r = meshes(root).map(worldBounds).reduce(union);
    assert.ok(r.minZ >= suite.bedroom.z + 0.175 && r.maxZ <= 54.454166666666666);
    assert.ok(r.minX >= suite.notch.x + suite.notch.w + 0.175 && r.maxX <= 31.025);
  }
  assert.ok(model.find('Guest bedroom west-wall television'));
  const bank = require('../assets/js/floor-plan-ground.js').getGroundFrontWindows().find(w => w.name === 'Bedroom porch window');
  assert.deepEqual(bank, { name: 'Bedroom porch window', center: 25, width: 7.6, sill: 3, height: 5 });
});

test('a continuous 24-inch route screen connects bedroom, closet, basin, shower and private WC with fronts closed', () => {
  const model = build();
  const sliders = ['Guest walk-through closet pocket door', 'Guest bathroom pocket entry from closet'].map(name => model.find(name));
  for (const door of sliders) door.position.x = door.userData.interactiveHouseDoor.openCenterX;
  const wcDoor = model.find('Guest private WC inward sound-door study');
  wcDoor.rotation.y = 0;
  const names = ['Guest west wardrobe built-in', 'Guest Bosch WGB24600UC WQB245B0UC laundry stack', 'Guest north-east drawer and folding tower',
    'Guest laundry-wall upper shelves', 'Guest closet north-wall dressing mirror',
    'Guest bathroom vanity', 'Guest bathroom shower', 'Guest bathroom toilet',
    'Guest walk-through closet pocket door', 'Guest bathroom pocket entry from closet',
    'Guest private WC inward sound-door study'];
  const obstacles = names.flatMap(name => meshes(model.find(name)).map(worldBounds)).filter(b => b.maxY > 0.5 && b.minY < 6.5);
  const points = [];
  function segment(a, b) {
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
    for (let i = 0; i <= steps; i++) points.push([a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]);
  }
  const north = suite.bathroom.z;
  segment([25.55, 45], [25.55, north + 3.120833333333333]);
  // Shower branch follows the shifted east entry of the wall-to-wall shower.
  segment([25.55, north + 3.35], [22.3, north + 3.35]);
  // Recenter this branch in the shortened WC entry, clear of its open leaf.
  segment([25.55, north + 3.35], [29.5, north + 3.35]);
  for (const [x, z] of points) {
    const route = { minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1 };
    for (const b of obstacles) assert.equal(intersectsXZ(route, b), false, `24-in screening envelope at ${x},${z}; not a person/accessibility standard`);
  }
  for (const door of sliders) door.position.x = door.userData.interactiveHouseDoor.closedCenterX;
  wcDoor.rotation.y = Math.PI / 2;
});

test('Yamaha console constituent bounds fit the independently extended hall-facing recess', () => {
  const model = build();
  const piano = model.find('Yamaha ARIUS YDP-145 dimensioned study proxy');
  const b = meshes(piano).map(worldBounds).reduce(union);
  close((b.maxZ - b.minZ) * 304.8, 1357);
  close((b.maxX - b.minX) * 304.8, 422);
  close(b.maxY * 304.8, 969);
  const console = worldBounds(meshes(piano).find(part => part.name === 'YDP-145 rear console housing'));
  close(console.maxY * 304.8, 815);
  const keyboard = worldBounds(meshes(piano).find(part => part.name === 'YDP-145 keyboard proxy'));
  assert.ok(keyboard.maxX < console.minX, 'White key surface is exposed in front of rear case, not buried in a full-depth black solid');
  assert.ok(b.minZ > suite.notch.z + 0.175);
  assert.ok(b.maxZ < suite.notch.z + suite.notch.d - 0.175);
  close((b.minZ - suite.notch.z - 0.175) * 12, 3);
  assert.ok(b.minX >= 19 && b.maxX < 19 + suite.notch.w - 0.175 - 0.0625, 'Console clears back wall and low baseboard');
  close(suite.notch.z, suite.closet.z);
  close(suite.notch.z + suite.notch.d, suite.closetSouthZ);
  close(suite.shower.z + suite.shower.d, suite.notch.z - 0.175, 'Built-in shower pan meets the recess wall paint face');
  const bench = model.find('Guest piano provisional 24 x 12 inch bench');
  const seat = worldBounds(meshes(bench)[0]);
  close(seat.maxZ - seat.minZ, 2);
  close(seat.maxX - seat.minX, 1);
  close(bench.position.x, 19.15);
  assert.equal(bench.userData.defaultTucked, true);
  close((seat.maxX - b.minX) * 12, 5.7);
  for (const benchPart of meshes(bench)) for (const pianoPart of meshes(piano)) {
    const a = worldBounds(benchPart), p = worldBounds(pianoPart);
    assert.equal(['X', 'Y', 'Z'].every(axis =>
      Math.min(a[`max${axis}`], p[`max${axis}`]) - Math.max(a[`min${axis}`], p[`min${axis}`]) > 1e-8), false,
    `${benchPart.name} clears ${pianoPart.name} in XYZ; plan overlap beneath keyboard is intended`);
  }
  const rail = worldBounds(meshes(piano).find(p => p.name === 'YDP-145 pedal rail'));
  const legs = meshes(bench).filter(p => p.name === 'Guest piano bench leg').map(worldBounds);
  close((rail.minX - Math.max(...legs.map(b => b.maxX))) * 12, 0.3870866141732);
  close((console.minY - seat.maxY) * 12, 7.0066141732283);
  assert.equal(bench.userData.occupiedHallRouteVerified, false);
});

test('walk-through closet keeps its shell with west wardrobe, north-east tower and retained south-east laundry', () => {
  const model = build();
  close((suite.closet.d - 0.35) * 12, 59.4251968503937);
  close((require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ - 0.225 - suite.bedroom.z - 0.175) * 12, 132);
  const west = meshes(model.find('Guest west wardrobe built-in')).map(worldBounds).reduce(union);
  const tower = meshes(model.find('Guest north-east drawer and folding tower')).map(worldBounds).reduce(union);
  const east = meshes(model.find('Guest Bosch WGB24600UC WQB245B0UC laundry stack')).map(worldBounds).reduce(union);
  // Standard 24-in body depth plus the 96-inch luggage shelf's 5/8-in rear
  // scribe; it and the separate upper end scribes stop 1/8 in from paint.
  close((west.maxX - west.minX) * 12, 24.625);
  close((east.maxX - east.minX) * 12, 26);
  close((west.maxZ - west.minZ) * 12, 59.4251968503937 - 0.25);
  close((east.maxZ - east.minZ) * 12, 23.5);
  assert.ok(west.maxX < suite.closetDoor.x && east.minX > suite.closetDoor.x + suite.closetDoor.width && tower.minX > suite.closetDoor.x + suite.closetDoor.width);
  close((tower.maxZ - tower.minZ) * 12, 30);
  assert.ok(west.minX > suite.notch.x + suite.notch.w + 0.175);
  close((east.minX - west.maxX) * 12, 66.35);
  for (const name of ['Guest walk-through closet pocket door', 'Guest bathroom pocket entry from closet']) {
    const door = model.find(name);
    const data = door.userData.interactiveHouseDoor;
    assert.equal(data.operation, 'sliding');
    assert.equal(door.userData.nominalHeightInches ?? door.userData.heightInches, 96);
    for (let t = 0; t <= 1.001; t += 0.1) {
      door.position.x = data.closedCenterX + t * (data.openCenterX - data.closedCenterX);
      for (const part of meshes(door)) for (const storage of [west, east, tower]) assert.equal(intersectsXZ(worldBounds(part), storage), false);
    }
    door.position.x = data.closedCenterX;
  }
});

test('coordinated suite floor contours conserve area and keep piano hall recess out of all three rooms', () => {
  const plan = require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan();
  const floors = plan.floors.filter(({ room }) => ['Bathroom', 'Closet', 'Guest room', 'Hall piano recess'].includes(room));
  close(floors.reduce((sum, f) => sum + f.w * f.d, 0), 12.2 * (suite.bedroom.z + suite.bedroom.d - suite.bathroom.z));
  const recess = floors.find(f => f.room === 'Hall piano recess');
  for (const f of floors.filter(f => f !== recess)) {
    assert.equal(intersectsXZ({ minX: f.x, maxX: f.x + f.w, minZ: f.z, maxZ: f.z + f.d },
      { minX: recess.x, maxX: recess.x + recess.w, minZ: recess.z, maxZ: recess.z + recess.d }), false);
  }
});

test('trim exclusions meet shower, vanity and straight recess paint faces with no strip beside the shower', () => {
  const spans = [];
  class Vector2 { constructor(x, y) { Object.assign(this, { x, y }); } }
  const start = source.indexOf('      // Keep timber trim out of the guest shower');
  const end = source.indexOf('      // Fireplace stone only', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { THREE: { Vector2 }, guestSuite: suite, Math,
    cover(a, b, normal) { spans.push({ a, b, normal }); } });
  const north = spans.filter(s => s.normal.y === 1);
  assert.equal(north.length, 3, 'Shower, vanity and WC tank each have a trim-free north wall span');
  for (const s of north) close(s.a.y, suite.bathroom.z + 0.175);
  const west = spans.find(s => s.normal.x === 1);
  close(west.a.x, 19.175);
  close(west.b.y, suite.shower.z + suite.shower.d);
  const recess = spans.find(s => s.normal.y === -1);
  close(recess.a.y, suite.notch.z - 0.175);
  close(recess.b.x, suite.shower.x + suite.shower.w, 'No baseboard along the south wall inside the shower');
  close(recess.a.y, suite.shower.z + suite.shower.d);
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
