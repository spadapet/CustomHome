'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGroundFloorDefaultPlan, getGroundFrontLayout, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout } = require('../floor-plan-ground.js');
const baseline = getGroundFloorDefaultPlan();

test('front rooms and porch extend 5.75 inches to an approximately 64-foot envelope', () => {
  const front = getGroundFrontLayout();
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
  close(front.extension, 23 / 48);
  close(front.wallZ, 54.2 + 23 / 48);
  close(front.porchDepth, 7);
  close(front.porchEdgeZ, front.wallZ + 7);
  const office = baseline.rooms.find(({ name }) => name === 'Office');
  const bedroom = baseline.rooms.find(({ name }) => name === 'Guest room');
  const porch = baseline.rooms.find(({ name }) => name === 'Front porch');
  close(office.d, front.wallZ - 41);
  close(bedroom.d, front.wallZ - 44.4);
  close(porch.z, front.wallZ);
  close(porch.d, 7);
  close(front.porchEdgeZ - (-2.325), 64.00416666666666);
});

test('image-scaled kids, bathroom, shallow-closet and bedroom bands meet without overlap', () => {
  const s = getGuestSuiteLayout();
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
  for (const [part, expected] of [[s.bathroom, { x: 19, z: 37.2, w: 12.2, d: 4.8 }],
    [s.closet, { x: 19, z: 42, w: 12.2, d: 2.4 }]]) {
    for (const key of Object.keys(expected)) close(part[key], expected[key]);
  }
  assert.deepEqual(s.bedroomDoor, { x: 19, z: 44.8, width: 3, height: 8, hinge: 'south', inward: true, maxAngleDegrees: 90 });
  assert.deepEqual(s.bathroomDoor, { x: 27.95, z: 42, width: 2.5, height: 8, hinge: 'west', inward: true, maxAngleDegrees: 90 });
  assert.equal(s.bedroom.z, s.closet.z + s.closet.d);
  close(s.bedroom.d, getGroundFrontLayout().wallZ - 44.4);
  close(s.kidsSouthZ, s.bathroom.z);
  const kids = baseline.floors.filter(({ room }) => /^Kids room/.test(room ?? ''));
  assert.equal(kids.length, 2, 'The NE kitchen return creates a two-rectangle kids floor');
  close(kids[0].x, 19); close(kids[0].w, 10); close(kids[0].z, baseline.rooms.find(({ name }) => name === 'Kids room').z);
  close(kids[1].x, 29); close(kids[1].w, 2.2); close(kids[1].z, 26.9);
  close(kids.reduce((sum, { w, d }) => sum + w * d, 0), 147.29333333333332);
  const zones = baseline.floors.filter(({ room }) => /^(Kids room|Closet$|Bathroom$|Guest room$)/.test(room ?? ''));
  for (const f of zones) assert.ok(f.w > 0 && f.d > 0);
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    const a = zones[i], b = zones[j];
    assert.ok(Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) < 1e-8 ||
      Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) < 1e-8, `${a.room} overlaps ${b.room}`);
  }
});

test('powder room uses the shared hardwood floor without a tile overlay', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const floors = [];
  const guestEntry = getGuestEntryLayout();
  const guestSuite = getGuestSuiteLayout();
  const stairOpening = { x: 0.5, z: 28, width: 10, depth: 6 };
  const start = source.lastIndexOf('  [', source.indexOf('    [37.5, 15,'));
  const end = source.indexOf(';', source.indexOf('].forEach(([x, z, w, d, hardwood')) + 1;
  vm.runInNewContext(source.slice(start, end), {
    guestEntry, guestSuite, stairOpening, shell: {}, powderNorthZ: guestEntry.powder.z,
    groundFrontWallZ: getGroundFrontLayout().wallZ, groundFrontLayout: getGroundFrontLayout(),
    powderEntryWallZ: guestEntry.alcove.z, officeNorthZ: guestEntry.officeNorthZ,
    kidsRoom: { x: 19, z: 25.7, depth: 8.9 },
    floor(x, z, w, d, hardwood) { floors.push({ x, z, w, d, hardwood }); }
  });
  const powder = floors.find(({ x, z }) => x === guestEntry.powder.x && z === guestEntry.powder.z);
  assert.deepEqual(powder, { ...guestEntry.powder, hardwood: true });
  assert.ok(!source.includes("tiledFloor('Powder room tile'"), 'No tile covers the hardwood');
});

test('all ground-floor door and passage openings are eight feet above their floor datum', () => {
  let count = 0;
  for (const [name, , , , , openings = []] of baseline.walls) {
    for (const [, , bottom, top] of openings) {
      if (bottom > 0) continue;
      assert.equal(top - bottom, 8, `${name} door opening is 96 inches tall`);
      count++;
    }
  }
  assert.ok(count >= 15, 'Covers interior, exterior, closet and garage openings');
  const entry = getGuestEntryLayout();
  const suite = getGuestSuiteLayout();
  for (const door of [entry.powderDoor, entry.closetDoor, suite.bedroomDoor, suite.bathroomDoor, suite.shower,
    ...suite.closets.map(({ door }) => door)]) assert.equal(door.height, 8);
});

test.skip('superseded walk-in closet and east-side bath study', () => {
  const suite = getGuestSuiteLayout();
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
  const bathroom = baseline.rooms.find((room) => room.name === 'Bathroom');
  assert.deepEqual(bathroom, { name: 'Bathroom', ...suite.bathroom });
  const guestRoom = baseline.rooms.find((room) => room.name === 'Guest room');
  assert.equal(guestRoom.x, 19);
  assert.equal(guestRoom.z, 43.2);
  assert.equal(guestRoom.w, 12.2);
  close(guestRoom.d, 11 + getGroundFrontLayout().extension);
  assert.ok(!baseline.rooms.some((room) => /Guest room (entry|nook)/.test(room.name)));
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Closet'), { name: 'Closet', ...suite.closet });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Laundry'));
  assert.ok(!baseline.walls.some(([name]) => name === 'Laundry north'));
  close(baseline.floors.filter((floor) => ['Closet', 'Bathroom', 'Kids room extension', 'Guest room'].includes(floor.room)).reduce((area, floor) => area + floor.w * floor.d, 0), 12.2 * (19.6 + getGroundFrontLayout().extension) + 5.45);
  assert.ok(!baseline.rooms.some((room) => room.name === 'Guest sink alcove'));
  close(suite.bathroom.z + suite.bathroom.d, guestRoom.z);
  assert.ok(!baseline.walls.some(([name]) => name === 'Guest vanity privacy return'));
  for (const [name, door, west, east] of [
    ['Closet south', suite.closetDoor, 19, 25.75],
    ['Bathroom south', suite.bathroomDoor, 25.75, 31.2]
  ]) {
    const wall = baseline.walls.find(([wallName]) => wallName === name);
    close(wall[1] + wall[5][0][0], door.x);
    close(wall[1] + wall[5][0][1], door.x + door.width);
    close(wall[2], door.z);
    close(door.width * 12, name === 'Closet south' ? 30 : 28);
    const casing = (2.5 + 0.125) / 12;
    assert.ok(door.x - west - 0.175 >= casing);
    assert.ok(east - 0.175 - door.x - door.width >= casing);
  }
  close(suite.shower.clearWidth * 12, 58.2);
  close(suite.shower.clearDepth * 12, 36);
  close((suite.shower.w - 0.2) * 12, 58.2);
  close((suite.shower.d - 0.2) * 12, 36);
  assert.equal(suite.shower.rotation, 0);
  close(suite.shower.x, suite.bathroom.x + 0.2);
  assert.ok(suite.shower.z + suite.shower.d < suite.toilet.z - 0.825);
  assert.equal(suite.vanity.basinCount, 1);
  close(suite.vanity.width * 12, 30);
  assert.ok(suite.vanity.z - 1.28 - suite.toilet.z >= 1.5, 'Toilet south side clearance to counter');
  assert.ok(suite.toilet.z - (suite.shower.z + suite.shower.d) >= 1.5, 'Toilet north side clearance');
  assert.ok(suite.vanity.z + 1.28 < suite.bathroomDoor.z - 0.2375, 'Counter clears south trim');
  assert.ok(suite.vanity.x - 0.94 > suite.bathroom.x + 0.2375, 'Vanity is inside bathroom, never closet');
  assert.ok(suite.toilet.x + 1.05 < 31.025, 'Toilet tank clears east wall');
  assert.ok(suite.toilet.z + 0.825 < suite.bathroomDoor.z - 0.175);
  assert.equal(suite.toilet.rotation, -Math.PI / 2);
  close(suite.closet.d, 6);
  close(suite.closet.w, 6.75);
  assert.equal(suite.closetDoor.pocket.retract, 'left');
  close(suite.closetDoor.width * 12, 30);
  close(suite.closetDoor.height * 12, 96);
  close(suite.closetDoor.x + suite.closetDoor.width + 2.5 / 12 + 0.125 / 12 + 0.0625, 25.75 - 0.175);
  assert.ok(suite.closetDoor.pocket.w >= suite.closetDoor.pocket.leafWidth);
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Entry hall'), { name: 'Entry hall', x: 12.2, z: 34.6, w: 6.8, d: getGroundFrontLayout().wallZ - 34.6 });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Closet hall'), 'No narrowed north hall remains');
  for (const zone of [...suite.closetStorage.hanging, suite.closetStorage.shelves]) assert.ok(zone.x >= 0.2375 && zone.x + zone.w <= 6.7625 && zone.z + zone.d <= 5.7625, 'Storage clears finished walls and base trim');
  close(suite.kidsExtension.w * suite.kidsExtension.d, 17.55);
  assert.equal(baseline.walls.find(([name]) => name === 'Guest west')[1], 19);
  assert.deepEqual(baseline.walls.find(([name]) => name === 'Garage west').slice(1), [31.2, 34.6, 31.2, 49]);
});

test.skip('superseded walk-in fixtures, pocket door and bath-clearance study', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.userData = {};
    }
    add(child) { this.children.push(child); }
    traverse(fn) { fn(this); for (const child of this.children) child.traverse ? child.traverse(fn) : fn(child); }
  }
  const items = [];
  const context = {
    THREE: { Group, Shape: class { moveTo() {} lineTo() {} closePath() {} },
      ExtrudeGeometry: class {}, Mesh: class extends Group {},
      PointLight: class { constructor() { this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; } } }, guestSuite: getGuestSuiteLayout(),
    windowTrim: {}, cream: {}, brass: {}, black: {}, porcelain: {}, countertop: {}, guestVanityStone: {}, cabinetRailFinish: {}, cabinetPanelFinish: {}, glass: {}, steel: {}, oak: {}, linen: {}, powderGlow: {}, cabinetFinish: {},
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      Object.assign(group, { name, x, z });
      group.rotation.y = rotation;
      items.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'All shower and door parts use a defined material');
      const mesh = { x, y, z, w, h, d, material, userData: {} };
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      const mesh = { x, y, z, radius, height, material, rotation: {} };
      parent.add(mesh);
      return mesh;
    },
    tiledFloor(name, x, z, w, d) { items.push({ name, x, z, w, d }); },
    cabinet() {},
    toilet(name, x, z, rotation) { items.push({ name, x, z, rotation }); }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function shakerFront(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  function vanity('), source.indexOf('  const powderStone =')), context);
  vm.runInNewContext(source.slice(source.indexOf("  const wardrobe = furnishing("), source.indexOf("  const guestCoats =")), context);
  vm.runInNewContext(source.slice(source.indexOf("  tiledFloor('Guest bathroom tile'"), source.indexOf("  const frontDoor =")), context);
  const suite = context.guestSuite;
  const find = (name) => items.find((item) => item.name === name);
  const wardrobe = find('Guest walk-in closet fittings');
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous long-hang rail').length, 1);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous short-hang rail').length, 2);
  const closetParts = [];
  wardrobe.traverse((part) => closetParts.push(part));
  assert.equal(closetParts.filter((part) => part.name === 'Guest wardrobe adjustable folded-clothes shelf').length, 5);
  const hangingShelves = closetParts.filter((part) => part.name === 'Guest closet hanging-zone upper shelf');
  assert.equal(hangingShelves.length, 2);
  assert.equal(wardrobe.rotation.y, 0);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest wardrobe sliding Shaker front').length, 0);
  assert.equal(wardrobe.userData.hangingRunInches, 48);
  assert.deepEqual(find('Guest bathroom tile'), { name: 'Guest bathroom tile', ...suite.bathroom });
  assert.equal(find('Guest bathroom vanity').x, suite.vanity.x);
  assert.equal(find('Guest bathroom vanity').z, suite.vanity.z);
  assert.equal(find('Guest bathroom vanity').userData.widthInches, 30);
  assert.equal(find('Guest bathroom vanity').rotation.y, suite.vanity.rotation);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity basin \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity faucet spout \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity mirror \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').userData.basinCenterSpacingInches, 0);
  const basin = find('Guest bathroom vanity').children.find((part) => part.name === 'Guest bathroom vanity basin 1');
  const mirror = find('Guest bathroom vanity').children.find((part) => part.name === 'Guest bathroom vanity mirror 1');
  assert.equal(basin.position.x, 0, 'Basin is centered on whole counter');
  assert.equal(find('Guest bathroom vanity').children.find(p => p.name === 'Guest bathroom vanity faucet spout 1').x, 0);
  assert.equal(basin.children.find(p => p.name === 'Guest undermount basin bottom').w * 12, 14);
  assert.equal(basin.children.length, 5, 'Undermount basin has no solid fill');
  assert.equal(mirror.x, 0);
  assert.equal(mirror.w * 12, 24);
  assert.equal(find('Guest bathroom vanity').userData.mirrorWidthInches, 24);
  const vanity = find('Guest bathroom vanity');
  const cabinetDoor = vanity.children.filter((part) => part.name === 'Guest vanity left cabinet door');
  const drawers = vanity.children.filter((part) => /^Guest vanity right pull-out drawer \d$/.test(part.name));
  assert.equal(cabinetDoor.length, 2);
  assert.equal(vanity.userData.cabinetDoors, 2);
  assert.match(vanity.userData.finish, /white oak.*gold bar pulls/);
  assert.deepEqual(cabinetDoor.map((front) => front.userData.hingeSide), [-1, 1]);
  for (const front of cabinetDoor) {
    const pull = front.children.find((part) => part.name === 'Gold cabinet pull');
    assert.equal(pull.children[0].w, 0.045);
    assert.ok(Math.abs(pull.children[0].h * 12 - 4.8) < 1e-8);
    assert.ok(pull.children.every(p => p.material === context.brass));
    assert.ok(front.children.filter(p => p.w).every(p => [context.cabinetFinish, context.cabinetRailFinish, context.cabinetPanelFinish].includes(p.material)));
    assert.equal(Math.sign(pull.position.x), -front.userData.hingeSide);
  }
  assert.equal(drawers.length, 3);
  assert.equal(vanity.userData.openBayWidthInches, 16.875);
  assert.equal(vanity.userData.drawerBankWidthInches, 12);
  assert.equal(vanity.children.filter((part) => part.name === 'Guest vanity cabinet floor').length, 1);
  assert.ok(vanity.children.some((part) => part.name === 'Guest removable hollow wastebasket'));
  const bin = vanity.children.find((part) => part.name === 'Guest removable hollow wastebasket');
  assert.ok(Math.abs(bin.position.y * 12 - 4.215) < 1e-8, 'Bin rests on full cabinet floor');
  // At 90 degrees the real 0.08 ft Shaker stiles project into the
  // frameless opening, but still leave room for the 12-inch extraction reserve.
  const hingeLeft = cabinetDoor[0].position.x - cabinetDoor[0].userData.width / 2;
  const hingeRight = cabinetDoor[1].position.x + cabinetDoor[1].userData.width / 2;
  assert.ok(hingeRight - hingeLeft - 0.08 > 1);
  const drawerLeftEdge = drawers[0].position.x - drawers[0].children.find(p => p.name === 'Guest vanity drawer Shaker front').userData.width / 2;
  assert.ok(hingeRight + 0.04 < drawerLeftEdge, 'Open right door thickness clears the closed drawer fronts');
  const solids = bin.children;
  assert.equal(solids.length, 5, 'Removable bin has four walls and a bottom, no lid or solid fill');
  const extent = (parts, axis, dimension) => [
    Math.min(...parts.map((p) => p[axis] - p[dimension] / 2)),
    Math.max(...parts.map((p) => p[axis] + p[dimension] / 2))
  ];
  for (const [axis, dimension, inches] of [['x', 'w', 10], ['y', 'h', 14], ['z', 'd', 10]]) {
    const [lo, hi] = extent(solids, axis, dimension);
    assert.ok(Math.abs((hi - lo) * 12 - inches) < 1e-8);
  }
  // Test constituent solids against a larger 12 x 12 x 18 in removal envelope.
  // Coordinates here are in the executed vanity's local frame; browser checks
  // additionally apply real Three.js world matrices and interactive travel.
  const reservation = { x: bin.position.x, y: bin.position.y + 0.75, z: bin.position.z, w: 1, h: 1.5, d: 1 };
  const overlaps = (a, b) => ['x', 'y', 'z'].every((axis, i) => {
    const dim = ['w', 'h', 'd'][i];
    return Math.min(a[axis] + a[dim] / 2, b[axis] + b[dim] / 2) - Math.max(a[axis] - a[dim] / 2, b[axis] - b[dim] / 2) > 1e-8;
  });
  for (const part of vanity.children) {
    if (part.w) assert.equal(overlaps(reservation, part), false, part.name);
    if (/tailpiece|rear supply/.test(part.name)) assert.ok(part.y - part.height / 2 > reservation.y + reservation.h / 2);
  }
  for (const extension of [0, 0.625, 1.25]) {
    for (const drawer of drawers) for (const p of drawer.children.filter((p) => p.w)) {
      const solid = { ...p, x: p.x + drawer.position.x, y: p.y + drawer.position.y, z: p.z + extension };
      for (const removal of [0, 0.5, 1, 1.5]) {
        assert.equal(overlaps({ ...reservation, z: reservation.z + removal }, solid), false, 'Basket removal clears actual drawer boxes at sampled travel');
      }
    }
    for (const p of vanity.children.filter((p) => p.w)) {
      assert.equal(overlaps({ ...reservation, z: reservation.z + extension }, p), false, `Removal clears ${p.name}`);
    }
  }
  const cavity = { x: bin.position.x, y: bin.position.y + 14 / 24, z: bin.position.z, w: 0.6, h: 0.9, d: 0.6 };
  for (const p of solids) assert.equal(overlaps(cavity, { ...p, x: p.x + bin.position.x, y: p.y + bin.position.y, z: p.z + bin.position.z }), false, 'Actual bin interior is hollow');
  assert.deepEqual(drawers.map((drawer) => drawer.position.y), [0.75, 1.5, 2.25]);
  for (const drawer of drawers) {
    const front = drawer.children.find((part) => part.name === 'Guest vanity drawer Shaker front');
    assert.equal(front.children.find((part) => part.name === 'Gold cabinet pull').children[0].w, 0.4);
    assert.equal(front.children.some((part) => /knob/.test(part.name)), false);
    assert.ok(drawer.position.x > 0, 'Every drawer is on the right when facing sink');
    assert.equal(drawer.userData.shownClosed, true);
    assert.equal(drawer.userData.travelFeet, 1.25);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer bottom').length, 1);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer side').length, 2);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer end').length, 2);
    assert.equal(front.userData.width, 0.96);
    const bottom = drawer.children.find((part) => part.name === 'Guest vanity drawer bottom');
    assert.ok(drawer.position.x - bottom.w / 2 > suite.vanity.width / 2 - 1 + 0.75 / 24, 'Drawer box clears cupboard divider');
    assert.ok(drawer.position.x + bottom.w / 2 < suite.vanity.width / 2 - 0.75 / 12, 'Drawer box clears cabinet side');
    assert.ok(suite.vanity.z + drawer.position.x + front.userData.width / 2 < suite.bathroomDoor.z - 0.2375, 'Right drawers clear bathroom south baseboard');
  }
  const bowlBottom = Math.min(...basin.children.map(p => p.y - p.h / 2));
  const upperDrawer = drawers[2];
  for (const p of upperDrawer.children.filter(p => /drawer (side|end|bottom)$/.test(p.name))) {
    assert.ok(upperDrawer.position.y + p.y + p.h / 2 < bowlBottom, 'Shallow top box clears centered bowl throughout travel');
  }
  const soap = vanity.children.find(p => p.name === 'Guest vanity soap bottle');
  assert.ok(soap.y - soap.height / 2 >= 2.84 - 1e-8, 'Soap rests on counter, not inside it');
  assert.ok(soap.x - soap.radius > 14 / 24 + 0.04, 'Soap clears actual basin rim');
  assert.equal(find('Guest bathroom toilet').x, suite.toilet.x);
  assert.equal(find('Guest bathroom toilet').z, suite.toilet.z);
  assert.equal(find('Guest bathroom toilet').rotation, -Math.PI / 2);
  assert.equal(find('Guest bathroom shower').rotation.y, 0);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => part.name === 'Guest bathroom warm opal vanity sconce').length, 2);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => part.name === 'Guest bathroom warm vanity light').length, 2);
  const towel = find('Guest bathroom wall-mounted towel hook');
  assert.equal(towel.userData.hookHeightInches, 48);
  assert.ok(towel.children.some((part) => part.name === 'Guest bathroom towel hook upturned tip'));
  assert.ok(towel.children.some((part) => part.name === 'Guest bathroom hanging towel'));
  const shower = find('Guest bathroom shower');
  const pan = shower.children.find((part) => part.name === 'Guest shower pan');
  assert.equal(shower.x, suite.shower.x);
  assert.equal(shower.z, suite.shower.z);
  assert.equal(pan.w, suite.shower.w);
  assert.equal(pan.d, suite.shower.d);
  // Measure executed constituent geometry, not the shower's metadata envelope.
  const sideCurbs = shower.children.filter((part) => part.name === 'Guest shower side curb').sort((a, b) => a.x - b.x);
  const endCurbs = shower.children.filter((part) => part.name === 'Guest shower end curb').sort((a, b) => a.z - b.z);
  assert.ok(Math.abs((sideCurbs[1].x - sideCurbs[1].w / 2 - sideCurbs[0].x - sideCurbs[0].w / 2) * 12 - 58.2) < 1e-8);
  assert.ok(Math.abs((endCurbs[1].z - endCurbs[1].d / 2 - endCurbs[0].z - endCurbs[0].d / 2) * 12 - 36) < 1e-8);
  const westStorageEdge = wardrobe.x + suite.closetStorage.shelves.x + suite.closetStorage.shelves.w;
  const knobFront = suite.vanity.x - 0.99;
  assert.ok((knobFront - (suite.bathroom.x + 0.2375)) * 12 > 38);
  assert.ok((knobFront - 1.25 - (suite.bathroom.x + 0.2375)) * 12 > 23, 'Close drawers before through-access');
  const counterScribe = vanity.children.find((part) => part.name === 'Guest vanity rear counter scribe');
  assert.ok(Math.abs(suite.vanity.x - counterScribe.z + counterScribe.d / 2 - 31.025) < 1e-8, 'Separate scribe meets east bathroom wall');
  for (const name of ['Guest shower drain', 'Guest shower rain head', 'Guest shower mixer control', 'Guest shower fixed southwest glass', 'Guest shower fixed southeast glass', 'Guest shower fixed east glass']) {
    assert.ok(shower.children.some((part) => part.name === name), name);
  }
  assert.equal(shower.userData.entryType, 'Open walk-in, fixed splash glass only');
  assert.equal(shower.userData.slidingDoor, false);
  assert.equal(shower.children.some((part) => part.name.includes('sliding glass door')), false);
  const westGlass = shower.children.find((part) => part.name === 'Guest shower fixed southwest glass');
  const eastGlass = shower.children.find((part) => part.name === 'Guest shower fixed southeast glass');
  const entranceWest = suite.shower.x + westGlass.x + westGlass.w / 2;
  const entranceEast = suite.shower.x + eastGlass.x - eastGlass.w / 2;
  assert.ok(Math.abs((entranceEast - entranceWest) * 12 - 30) < 1e-9, 'Fixed-glass edges form a 30-inch south-facing entry');
  assert.equal(westGlass.h, suite.shower.height);
  assert.equal(eastGlass.h, suite.shower.height);
  const routeObstacles = [
    { left: suite.toilet.x - 0.85, right: suite.toilet.x + 1.05, north: suite.toilet.z - 0.825, south: suite.toilet.z + 0.825 },
    { left: suite.bathroom.x - 0.175, right: suite.bathroomDoor.x, north: suite.bathroomDoor.z - 0.175, south: suite.bathroomDoor.z + 0.175 },
    { left: suite.bathroomDoor.x + 26 / 12, right: 31.375, north: suite.bathroomDoor.z - 0.175, south: suite.bathroomDoor.z + 0.175 }
  ];
  // Measure the executed counter and closed drawer constituents in world plan.
  // Rotation is -PI/2: local z projects west, local x projects south.
  for (const p of vanity.children.filter((p) => p.w)) {
    routeObstacles.push({ left: vanity.x - p.z - p.d / 2, right: vanity.x - p.z + p.d / 2, north: vanity.z + p.x - p.w / 2, south: vanity.z + p.x + p.w / 2 });
  }
  for (const drawer of drawers) for (const p of drawer.children.filter((p) => p.w)) {
    routeObstacles.push({ left: vanity.x - p.z - drawer.position.z - p.d / 2, right: vanity.x - p.z - drawer.position.z + p.d / 2, north: vanity.z + drawer.position.x + p.x - p.w / 2, south: vanity.z + drawer.position.x + p.x + p.w / 2 });
  }
  for (const part of shower.children.filter((part) => part.name.includes('fixed south'))) {
    routeObstacles.push({ left: shower.x + part.x - part.w / 2, right: shower.x + part.x + part.w / 2, north: shower.z + part.z - part.d / 2, south: shower.z + part.z + part.d / 2 });
  }
  const route = [[suite.bathroomDoor.x + 13 / 12, 45.5], [suite.bathroomDoor.x + 13 / 12, 41.7], [27.4, 40.1], [27.4, 36.9]];
  for (let index = 1; index < route.length; index++) {
    const [x0, z0] = route[index - 1], [x1, z1] = route[index];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.05);
    for (let step = 0; step <= steps; step++) {
      const x = x0 + (x1 - x0) * step / steps, z = z0 + (z1 - z0) * step / steps;
      assert.ok(routeObstacles.every((item) => Math.hypot(Math.max(item.left - x, 0, x - item.right), Math.max(item.north - z, 0, z - item.south)) >= 26 / 24 - 1e-9), `26-inch route blocked at ${x}, ${z}`);
    }
  }
  assert.ok(27.4 - 26 / 24 >= entranceWest && 27.4 + 26 / 24 <= entranceEast, 'Route passes through actual south-facing shower entry');
  assert.equal(find('Guest walk-in closet inward-opening door'), undefined);
  const opening = suite.bathroomDoor;
  const door = find('Guest bathroom inward-opening door');
  assert.equal(door.rotation.y, 0);
  assert.equal(door.z, opening.z);
  assert.equal(door.userData.hinge, 'West jamb');
  assert.equal(door.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  assert.equal(door.userData.interactiveHouseDoor.openRotationSign, 1);
  assert.equal(door.userData.nominalWidthInches, 28);
  assert.equal(door.userData.heightInches, 96);
  const panelLeaf = door.children.find((part) => part.name === 'Guest bathroom painted-white Shaker leaf');
  const leaf = { h: panelLeaf.userData.height, w: panelLeaf.userData.width, y: panelLeaf.position.y };
  assert.equal(leaf.h, opening.height - 0.04);
  assert.equal(leaf.y, opening.height / 2);
  assert.equal(opening.pocket, undefined);
  const pocket = find('Guest walk-in closet left pocket door');
  const operation = pocket.userData.interactiveHouseDoor;
  assert.equal(operation.open, false);
  assert.ok(operation.openCenterX - suite.closetDoor.pocket.leafWidth / 2 >= suite.closetDoor.pocket.x);
  assert.ok(operation.openCenterX + suite.closetDoor.pocket.leafWidth / 2 <= suite.closetDoor.x + 1e-8);
  assert.equal(find('Guest bathroom pocket door proposal - framing approval required'), undefined);
  assert.ok(!items.some((item) => item.name === 'Guest bathroom outward-opening door'));
});

test('guest powder room and coat closet have separate doors off an open hall alcove', () => {
  const entry = getGuestEntryLayout();
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
  const powderWall = baseline.walls.find(([name]) => name === 'Powder east');
  const closetWall = baseline.walls.find(([name]) => name === 'Guest coat closet front');
  const officeWall = baseline.walls.find(([name]) => name === 'Office east');
  close(entry.powder.z, 35.1);
  close(entry.officeNorthZ, 41);
  close(entry.alcove.d - 0.35, 3.15);
  assert.ok(entry.alcove.d - 0.35 >= 3, 'Alcove has at least 36 inches between finished wall faces');
  assert.ok(entry.coatCloset.d - 0.35 >= 2, 'Reach-in closet retains at least 24 inches of clear hanging depth');
  close(powderWall[2] + powderWall[5][0][0], entry.powderDoor.z);
  close(powderWall[5][0][1] - powderWall[5][0][0], 2.5);
  close(closetWall[1] + closetWall[5][0][0], entry.closetDoor.x);
  close(closetWall[5][0][1] - closetWall[5][0][0], 4);
  close(officeWall[2], entry.officeNorthZ);
  const casingWidth = (3.5 + 0.125) / 12;
  assert.ok(entry.powderDoor.z - entry.alcove.z - 0.175 > casingWidth, 'North jamb has room for the casing and reveal');
  assert.ok(entry.alcove.z + entry.alcove.d - 0.175 - entry.powderDoor.z - entry.powderDoor.width > casingWidth, 'South jamb has room for the casing and reveal');
  assert.ok(!baseline.walls.some(([, x1, z1, x2, z2]) => x1 === 12.2 && x2 === 12.2 && Math.min(z1, z2) < entry.alcove.z + entry.alcove.d && Math.max(z1, z2) > entry.alcove.z), 'No wall blocks the hall-facing alcove');
  const sharedArea = baseline.floors.filter((floor) => ['Powder room', 'Guest coat closet', 'Guest entry alcove', 'Office'].includes(floor.room)).reduce((sum, floor) => sum + floor.w * floor.d, 0);
  close(sharedArea, 12.2 * (getGroundFrontLayout().wallZ - 35.1));
  close(baseline.rooms.find((room) => room.name === 'Office').d, 13.2 + getGroundFrontLayout().extension);
  assert.ok(entry.vanity.z + entry.vanity.depth / 2 + 0.2 < entry.powderDoor.z, 'North-wall vanity stays north of the entire door opening');
  close(entry.coatCloset.z, entry.powder.z);
  close(entry.coatCloset.z + entry.coatCloset.d, entry.alcove.z);
  close(entry.alcove.z + entry.alcove.d, entry.officeNorthZ);
  for (const [name, part] of [['Guest coat closet', entry.coatCloset], ['Guest entry alcove', entry.alcove]]) {
    assert.deepEqual(baseline.rooms.find(room => room.name === name), { name, ...part });
    const floor = baseline.floors.find(floor => floor.room === name);
    close(floor.z, part.z);
    close(floor.d, part.d);
  }
  close(closetWall[2], entry.closetDoor.z);
});

test('guest coat French doors span the opening and swing outward from opposite jambs', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.scale = { x: 1, y: 1, z: 1 };
    }
    add(child) { this.children.push(child); }
  }
  let closet;
  const entry = getGuestEntryLayout();
  const context = {
    THREE: { Group }, guestEntry: entry, powderNorthZ: entry.powder.z, cabinetFinish: {}, brass: {}, linen: {}, cream: {}, windowTrim: {},
    furnishing(name, x, z) { closet = new Group(); closet.position.set(x, 0, z); return closet; },
    box() { return {}; },
    cylinder() { return { rotation: {} }; },
    shakerFront(parent, x, y, z, width, height) {
      const leaf = { x, y, z, width, height };
      parent.add(leaf);
      return leaf;
    },
    cabinetPull() {}
  };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function shakerFront(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  const guestCoats ='), source.indexOf('  const powderDoor =')), context);
  const hinges = closet.children;
  assert.equal(hinges.length, 2);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} differs from ${b}`);
  for (const [index, side] of [-1, 1].entries()) {
    const hinge = hinges[index], leaf = hinge.children[0];
    close(9.65 + hinge.position.x, entry.closetDoor.x + index * entry.closetDoor.width);
    close(closet.position.z + closet.scale.z * hinge.position.z, entry.closetDoor.z + entry.closetDoor.hingeOffset);
    close(leaf.userData.width, 1.96);
    close(leaf.userData.height, 7.96);
    close(hinge.position.x + leaf.position.x - side * leaf.userData.width / 2, side * 0.04);
    const operation = hinge.userData.interactiveHouseDoor;
    assert.equal(operation.operation, 'hinged');
    assert.equal(operation.openAngleDegrees, 0);
    assert.equal(operation.maxAngleDegrees, 90);
    for (let angle = 0; angle <= operation.maxAngleDegrees; angle++) {
      const radians = side * angle * Math.PI / 180;
      const freeEdgeZ = hinge.position.z - Math.sin(radians) * -side * leaf.userData.width;
      const worldZ = closet.position.z + closet.scale.z * freeEdgeZ;
      assert.ok(worldZ >= entry.closetDoor.z - 1e-9, 'Leaf swings south toward alcove, not hanging coats');
      for (const localX of [0, -side * leaf.userData.width]) for (const localZ of [-0.065, 0.065]) {
        const cornerZ = closet.position.z + hinge.position.z - Math.sin(radians) * localX + Math.cos(radians) * localZ;
        assert.ok(cornerZ >= entry.closetDoor.z + 0.175 + 0.75 / 12 + 0.125 / 12 - 1e-9, 'Actual leaf clears room-side casing by at least 1/8 inch throughout its sweep');
      }
    }
    assert.equal(operation.openRotationSign, side);
  }
  vm.runInNewContext(source.slice(source.indexOf('  const powderDoor ='), source.indexOf('  function toilet(')), context);
  const door = closet, pivot = door.children[0], panel = pivot.children[0];
  close(door.position.x, entry.powderDoor.x - entry.powderDoor.hingeOffset);
  close(door.position.z, entry.powderDoor.z + entry.powderDoor.width);
  close(pivot.position.z, 0);
  close(pivot.rotation.y, Math.PI / 2);
  close(panel.position.z, -entry.powderDoor.width / 2);
  assert.equal(pivot.userData.interactiveHouseDoor.openRotationSign, 1);
  assert.equal(pivot.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  assert.equal(door.userData.hinge, 'South jamb');
  for (let angle = 0; angle <= 90; angle++) {
    const r = angle * Math.PI / 180;
    for (const x of [-0.065, 0.065]) for (const z of [-2.48, -0.02]) {
      const worldX = door.position.x + Math.cos(r) * x + Math.sin(r) * z;
      const worldZ = door.position.z - Math.sin(r) * x + Math.cos(r) * z;
      assert.ok(worldX <= entry.powderDoor.x - 0.175 - 0.75 / 12 - 0.125 / 12 + 1e-9, 'Actual leaf clears room-side casing by at least 1/8 inch throughout its sweep');
      assert.ok(worldZ >= entry.vanity.z + entry.vanity.depth / 2 + 0.2, 'Actual hinged panel clears closed north-wall vanity');
      assert.ok(worldZ <= entry.officeNorthZ - 0.175, 'Actual hinged panel stays inside south wall');
      assert.ok(worldX > entry.toilet.x + 0.875, 'Actual hinged panel clears toilet');
    }
  }
});

test('October 31 reference aligns powder fixtures on the north wall and preserves the south-jamb entry sweep', () => {
  const entry = getGuestEntryLayout();
  assert.equal(entry.vanity.width * 12, 42);
  assert.equal(entry.vanity.depth * 12, 21);
  assert.equal(entry.vanity.rotation, 0);
  assert.equal(entry.toilet.rotation, 0);
  assert.ok(Math.abs(entry.toilet.z - 36.45) < 1e-9);
  const westVanityEdge = entry.vanity.x - (entry.vanity.width + 0.06) / 2;
  assert.ok(entry.toilet.x - 0.175 - 0.125 >= 15 / 12, 'Toilet center clears the west wall and base trim by at least 15 inches');
  assert.ok(westVanityEdge > entry.toilet.x + 1.25, 'Vanity stays east of a 30-inch-wide toilet approach');
  assert.ok(entry.officeNorthZ - 0.175 - entry.toilet.z - 0.848 >= 30 / 12, 'At least 30 inches forward of the modeled toilet front');
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  for (const name of ['Powder round brass mirror frame', 'Powder round mirror glass', 'Powder warm opal sconce', 'Powder low-level night-light concept', 'Powder inset basin interior']) assert.ok(source.includes(name), name);
  for (let angle = 0; angle <= 90; angle++) {
    const radians = angle * Math.PI / 180;
    const projectionZ = Math.max(2.48 * Math.cos(radians) + 0.065 * Math.sin(radians), 2.275 * Math.cos(radians) + 0.22 * Math.sin(radians));
    const doorNorth = entry.powderDoor.z + entry.powderDoor.width - projectionZ;
    assert.ok(doorNorth > entry.vanity.z + entry.vanity.depth / 2 + 0.2, 'Entire door sweep stays south of the vanity and projecting pulls');
    const projectionX = Math.max(2.48 * Math.sin(radians) + 0.065 * Math.cos(radians), 2.275 * Math.sin(radians) + 0.22 * Math.cos(radians));
    assert.ok(entry.powderDoor.x - entry.powderDoor.hingeOffset - projectionX > entry.toilet.x + 0.875, 'Entire door sweep stays east of the toilet');
  }
});

test('one standard-size powder window cuts the west wall and retains half-frosted glazing', () => {
  const entry = getGuestEntryLayout();
  const westWall = baseline.walls.find(([name]) => name === 'Office west');
  assert.equal(entry.windows.length, 1);
  const selected = entry.windows[0];
  assert.equal(selected.standardSizeCode, '2640');
  assert.equal(selected.width * 12, 29.5);
  assert.equal(selected.height * 12, 47.5);
  assert.equal(selected.openingWidth * 12, 30);
  assert.equal(selected.openingHeight, 4);
  assert.equal(selected.openingSill, 4);
  assert.equal(selected.openingSill + selected.openingHeight, 8);
  assert.ok(Math.abs(selected.sill + selected.height / 2 - 6) < 1e-9);
  assert.equal(selected.z, entry.powder.z + entry.powder.d / 2);
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.userData = {};
    }
    add(child) { this.children.push(child); }
  }
  Group.prototype.updateWorldMatrix = function () {};
  Group.prototype.localToWorld = function (vector) { return vector; };
  Group.prototype.worldToLocal = function (vector) { return vector; };
  const context = {
    getWindowProductIntent: require('../floor-plan-ground.js').getWindowProductIntent,
    THREE: { Group, Vector3: class { constructor(x,y,z) { Object.assign(this,{x,y,z}); } } }, scene: new Group(), windowTrim: {}, windowExterior: {}, glass: {}, privacyGlass: {},
    windowFaceDepth: () => 0.075, windowInstallations: [], wallThickness: 0.45,
    openingCasing() {},
    box(parent, x, y, z, width, height, depth, material) {
      const part = { x, y, z, width, height, depth, material };
      parent.add(part);
      return part;
    }
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  function windowFrame('), source.indexOf('  const livingWindowBank =')), context);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const exteriorContext = { ...context, glass: {}, privacyGlass: {}, windowBlack: {}, trim: {} };
  vm.runInNewContext(exterior.slice(exterior.indexOf('  function windowUnit('), exterior.indexOf('  function wall(')), exteriorContext);
  for (const window of entry.windows) {
    assert.deepEqual(westWall[5].find((opening) => Math.abs(westWall[2] + (opening[0] + opening[1]) / 2 - window.z) < 1e-9),
      [window.z - window.openingWidth / 2 - westWall[2], window.z + window.openingWidth / 2 - westWall[2], 4, 8]);
    assert.equal(window.privacyLowerHalf, true);
    context.windowFrame('Powder privacy test', 0.1, window.z, window.width, window.height, window.sill, -Math.PI / 2, context.scene, -1, { privacyLowerHalf: true, standardSizeCode: window.standardSizeCode });
    const frame = context.scene.children.at(-1);
    assert.equal(frame.userData.columns * frame.userData.rows, 1);
    assert.equal(frame.userData.privacyGlassTopFeet, 6);
    assert.equal(frame.userData.standardSizeCode, '2640');
    assert.equal(frame.userData.standardSizeVerified, false);
    assert.equal(frame.userData.productSelected, false);
    const sash = frame.children[0].children.find((part) => part.name === 'Closed side-hinged casement sash');
    const lower = sash.children.find((part) => part.name === 'Frosted lower-half privacy pane');
    const upper = sash.children.find((part) => part.name === 'Clear upper-half daylight pane');
    assert.equal(lower.material, context.privacyGlass);
    assert.equal(upper.material, context.glass);
    assert.equal(lower.height, upper.height);
    assert.ok(Math.abs(lower.y + lower.height / 2 - upper.y + upper.height / 2) < 1e-9, 'Glazing halves meet without a gap or overlap');
    assert.ok(Math.abs(window.sill + sash.position.y + lower.y + lower.height / 2 - 6) < 1e-9);
    const exteriorParent = new Group();
    exteriorContext.windowUnit(exteriorParent, window.z - 8, window.sill, window.width, window.height, true);
    const exteriorLower = exteriorParent.children[0].children.find((part) => part.name === 'Exterior powder frosted lower-half pane');
    assert.equal(exteriorLower.material, exteriorContext.privacyGlass);
    assert.equal(exteriorLower.height, window.height / 2);
  }
  const casingEnvelopeWidth = selected.width + 2 * (3.5 + 0.125) / 12 + 0.15;
  assert.ok(selected.z - casingEnvelopeWidth / 2 > entry.powder.z + 0.175);
  assert.ok(selected.z + casingEnvelopeWidth / 2 < entry.officeNorthZ - 0.175, 'Casing and sill cap fit the finished west wall');
});

test('powder vanity centers its sink and lighting between matching drawer banks and paired cupboard doors', () => {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.userData = {};
    }
    add(child) { this.children.push(child); }
  }
  const items = [];
  const context = {
    THREE: { Group, MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } } },
    guestEntry: getGuestEntryLayout(), powderNorthZ: getGuestEntryLayout().powder.z, officeNorthZ: getGuestEntryLayout().officeNorthZ, rest: new Group(),
    ...Object.fromEntries(['cabinetFinish', 'cabinetPanelFinish', 'cabinetRailFinish', 'countertop', 'brass', 'porcelain', 'steel', 'oak', 'linen'].map((name) => [name, { name }])),
    mat() { return {}; }, tiledFloor() {}, toilet() {}, windowFrame() {},
    furnishing(name, x, z, rotation = 0) {
      const item = new Group(); Object.assign(item, { name }); item.position.set(x, 0, z); item.rotation.y = rotation; items.push(item); return item;
    },
    box(parent, x, y, z, width, height, depth, material) {
      assert.ok(material);
      const part = new Group(); Object.assign(part, { width, height, depth, material }); part.position.set(x, y, z); parent.add(part); return part;
    }
  };
  context.cylinder = (parent, x, y, z, radius, height, material) => context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  const powderStone ='), source.indexOf("  tiledFloor('Guest bathroom tile'")), context);
  const vanity = items.find((item) => item.name === 'Powder vanity');
  const drawers = vanity.children.filter((part) => /^Powder vanity drawer \d$/.test(part.name));
  assert.equal(drawers.length, 6);
  assert.equal(vanity.userData.sinkBayWidthInches, 22);
  assert.equal(vanity.userData.drawerBankWidthInches, 10);
  assert.equal(vanity.userData.closeDrawersBeforeEntryDoorSwing, true);
  assert.equal(drawers.filter((drawer) => drawer.userData.side === 'Left').length, 3);
  assert.equal(drawers.filter((drawer) => drawer.userData.side === 'Right').length, 3);
  for (const drawer of drawers) {
    assert.ok(Math.abs(Math.abs(drawer.position.x) - 16 / 12) < 1e-9);
    assert.equal(drawer.position.z, 0);
    assert.equal(drawer.userData.travelFeet * 12, 15);
    assert.equal(drawer.userData.shownClosed, true);
    assert.equal(drawer.children.filter((part) => part.name === 'Powder drawer Shaker front').length, 1);
    assert.equal(drawer.children.filter((part) => part.name === 'Powder drawer bottom').length, 1);
    assert.equal(drawer.children.filter((part) => part.name === 'Powder drawer side').length, 2);
    const front = drawer.children.find((part) => part.name === 'Powder drawer Shaker front');
    assert.ok(drawer.position.x + front.userData.width / 2 < vanity.userData.plumbingZone.minX || drawer.position.x - front.userData.width / 2 > vanity.userData.plumbingZone.maxX, 'Both drawer banks stay outside the centered plumbing zone');
  }
  const left = drawers.filter((drawer) => drawer.userData.side === 'Left');
  const right = drawers.filter((drawer) => drawer.userData.side === 'Right');
  for (let row = 0; row < 3; row++) {
    assert.equal(left[row].position.x, -right[row].position.x);
    assert.equal(left[row].position.y, right[row].position.y);
  }
  const basin = vanity.children.find((part) => part.name === 'Powder inset basin interior');
  assert.equal(basin.position.x, 0);
  const counterSides = vanity.children.filter((part) => part.name === 'Powder counter beside basin opening');
  assert.equal(counterSides[0].width, counterSides[1].width, 'Actual counter edges leave equal space beside the centered sink');
  for (const name of ['Powder brass faucet stem', 'Powder brass faucet spout', 'Powder round brass mirror frame', 'Powder round mirror glass']) assert.equal(vanity.children.find((part) => part.name === name).position.x, basin.position.x);
  const sconces = vanity.children.filter((part) => part.name === 'Powder warm opal sconce');
  assert.equal(sconces[0].position.x, -sconces[1].position.x);
  const doors = vanity.children.filter((part) => part.name === 'Powder plumbing-access Shaker door');
  assert.equal(doors.length, 2);
  assert.equal(doors[0].position.x, -doors[1].position.x);
  const towel = items.find((item) => item.name === 'Powder wall-mounted hand towel');
  assert.equal(towel.userData.hookHeightInches, 48);
  assert.ok(towel.children.some((part) => part.name === 'Powder towel hook upturned tip'));
  assert.ok(towel.children.some((part) => part.name === 'Powder hanging hand towel'));
  assert.ok(!source.includes('Powder folded hand towel'), 'The counter towel is replaced by the wall-hung towel');
});

test('original wall-backed rail omissions preserve stringers and unrelated exposed-edge rails', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const parts = [];
  class Group {
    add() {}
  }
  const stairWidth = 44 / 12;
  const stairGap = 0.25;
  const stairDepth = baseline.stairs.depth;
  const stairRun = 70 / 12;
  const context = {
    THREE: { Group, PointLight: class { constructor() { this.position = { set() {} }; } } }, stairs: new Group(),
    stairWidth, stairGap, stairDepth, stairRun, wallSideStairWidth: stairDepth - stairWidth - stairGap,
    stairRisers: 8, stairRise: 7.5 / 12, stairGoing: 10 / 12, landingHeight: 5, landingEndX: stairRun + 4,
    stairEnclosureDepth: 11 / 12,
    oak: {}, walnut: {}, cream: {}, black: {}, wallMaterial: {}, stairStepGlow: {},
    stairBeam(name, start, end) { parts.push({ name, start, end }); },
    box(parent, x, y, z) {
      const mesh = { x, y, z };
      parts.push(mesh);
      return mesh;
    }
  };
  const flights = source.slice(source.indexOf('  for (const upper of [false, true])'), source.indexOf('  box(stairs, (stairRun + landingEndX) / 2, landingHeight - 0.1'));
  const landing = source.slice(source.indexOf('  const landingGuardZ ='), source.indexOf('  const upstairsStairParts ='));
  vm.runInNewContext(`${flights}\n${landing}`, context);
  const count = (name) => parts.filter((part) => part.name === name).length;
  assert.equal(count('Stair stringer'), 4);
  assert.equal(count('Upstairs oak tread'), 14);
  assert.equal(count('Landing riser'), 2);
  assert.equal(count('Sloped stair handrail'), 3);
  assert.equal(count('Horizontal stair guard rail'), 24);
  assert.equal(count('Stair guard post'), 9);
  assert.equal(count('Turning landing side handrail'), 1);
  assert.equal(count('Horizontal landing guard rail'), 8);
  assert.equal(count('Landing guard post'), 2);
  assert.equal(count('Landing guard nosing transition'), 0);
  assert.equal(count('Landing guard transition rail'), 0);
  for (const part of parts.filter((part) => /handrail|guard/.test(part.name))) {
    const z = part.start ? part.start[2] : part.z;
    assert.ok(Math.abs(z - stairDepth - 0.08) > 1e-9, 'No rail or post remains against the powder-room wall');
  }
});

test('kitchen-facing kids-room wall is flush with the tall cabinet fronts without moving the doorway', () => {
  const wall = baseline.walls.find(([name]) => name === 'Kids north');
  const room = baseline.rooms.find((room) => room.name === 'Kids room');
  const cabinetFrontZ = 26.725 - 25 / 12 - 0.08;
  assert.ok(Math.abs(wall[2] - 0.175 - cabinetFrontZ) < 1e-9);
  assert.ok(Math.abs((25.7 - wall[2]) * 12 - 11.56) < 1e-9);
  assert.ok(Math.abs(room.z + room.d - 37.2) < 1e-9);
  const west = baseline.walls.find(([name]) => name === 'Kids west');
  assert.ok(Math.abs(west[2] + west[5][0][0] - 27) < 1e-9);
  assert.ok(Math.abs(west[2] + west[5][0][1] - 31.5) < 1e-9);
  for (const floor of baseline.floors.filter((floor) => ['Hall', 'Kitchen'].includes(floor.room))) {
    for (const kidsFloor of baseline.floors.filter((floor) => floor.room === 'Kids room')) {
    const overlapX = Math.min(floor.x + floor.w, kidsFloor.x + kidsFloor.w) - Math.max(floor.x, kidsFloor.x);
    const overlapZ = Math.min(floor.z + floor.d, kidsFloor.z + kidsFloor.d) - Math.max(floor.z, kidsFloor.z);
    assert.ok(overlapX < 1e-9 || overlapZ < 1e-9, 'Floor slabs meet without overlapping the expanded kids room');
    }
  }
});

test('kids-room kitchen return and garage partition stay aligned around the full-width bath', () => {
  const wall = baseline.walls.find(([name]) => name === 'Garage west return');
  assert.deepEqual(wall.slice(1), [31.2, 26.9, 31.2, 34.6]);
  assert.equal(baseline.walls.find(([name]) => name === 'Kids south')[2], 37.2);
  assert.ok(!baseline.walls.some(([name]) => name === 'Garage southwest return'));
  const floors = baseline.floors.filter((floor) => floor.room === 'Kids room');
  const area = floors.reduce((sum, floor) => sum + floor.w * floor.d, 0);
  assert.ok(Math.abs(area - 147.29333333333332) < 1e-9);
  assert.ok(Math.abs(floors.find(({ x }) => x === 29).w * floors.find(({ x }) => x === 29).d - 22.66) < 1e-9);
  for (const kids of floors) for (const garage of baseline.floors.filter((floor) => floor.room === 'Garage')) {
    assert.ok(Math.min(kids.x + kids.w, garage.x + garage.w) - Math.max(kids.x, garage.x) < 1e-9 ||
      Math.min(kids.z + kids.d, garage.z + garage.d) - Math.max(kids.z, garage.z) < 1e-9);
  }
});

test('fireplace built-ins are removed entirely and baseboard runs continuously from each wall end to the stone return', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  // Both remaining halved boxes and every constituent part are deleted from the source, not hidden.
  assert.doesNotMatch(source, /fireplaceBuiltIns|fireplaceBuiltInLayout|Paired low white-oak fireplace built-ins|halved fireplace built-in'|Fireplace cabinet recessed plinth|Standard 36 inch cabinet side|Fireplace cabinet media shelf|Closed Shaker media door|Stone-side cabinet scribe filler|Finished exposed cabinet end panel|Continuous low oak built-in top/);
  assert.doesNotMatch(source, /builtInRunWidth|restored fireplace built-in|Restored cabinet recessed plinth|Separate fireplace cabinet end filler|builtInsHalved|builtInFrontX/);
  assert.doesNotMatch(source, /stairBookcases|bookcaseBays|Built-in shelf book/);
  assert.doesNotMatch(source, /door conflicts when open|wall-length cabinet/);
  for (const name of ['Floor-to-ceiling stone fireplace', 'White oak fireplace mantel', 'Fireplace television', 'Fireplace stone side return']) assert.ok(source.includes(`'${name}'`), name);
  // Baseboard: the only window-wall suppression is the stone itself, ending exactly at each stone side return.
  const covers = [];
  class Vector2 { constructor(x, y) { Object.assign(this, { x, y }); } }
  const start = source.indexOf('      for (const run of edges) cover(run.a, run.b, run.normal);');
  const end = source.indexOf('      for (const wall of baseTrimSections)', start);
  assert.ok(start > 0 && end > start);
  const halfSource = source.match(/  const fireplaceStoneHalfWidth = [\d.]+;/);
  assert.ok(halfSource, 'Stone half-width is a shared named constant');
  const feature = getLivingRoomFeatureLayout();
  vm.runInNewContext(`${halfSource[0]}\n${source.slice(source.indexOf('\n', start), end)}`, {
    THREE: { Vector2 }, livingFeatureWall: feature, guestEntry: { stairGuard: { x: 99, z: 99 } },
    guestSuite: { shower: { x: 99, z: 99, w: 1, d: 1 }, bathroom: { x: 99 }, toilet: { z: 99 }, vanity: { z: 99 } },
    cover(a, b, normal) { covers.push({ a, b, normal }); }
  });
  const onWindowWall = covers.filter(({ a, b, normal }) => Math.abs(a.x - 0.175) < 0.01 && Math.abs(b.x - 0.175) < 0.01 && normal.x === 1 &&
    Math.max(a.y, b.y) > feature.wallStartZ && Math.min(a.y, b.y) < feature.wallEndZ);
  assert.equal(onWindowWall.length, 1, 'One suppression span: the stone only');
  const [{ a, b }] = onWindowWall;
  // Stone side returns are 0.06 ft boxes centered at centerZ -/+ 3.03, so their outer faces are at -/+ 3.06.
  assert.ok(Math.abs(Math.min(a.y, b.y) - (feature.centerZ - 3.06)) < 1e-9, 'Dining-side baseboard runs to the stone return');
  assert.ok(Math.abs(Math.max(a.y, b.y) - (feature.centerZ + 3.06)) < 1e-9, 'Stair-side baseboard runs to the stone return');
  assert.match(source, /for \(const z of \[livingCenterZ - 3\.03, livingCenterZ \+ 3\.03\]\)/, 'Stone return positions match the baseboard stop');
  // Continuous run per side from the wall end to the stone: 74.88 in.
  assert.ok(Math.abs((feature.centerZ - 3.06 - feature.wallStartZ) * 12 - 74.88) < 0.01, 'Dining-side continuous baseboard length');
  assert.ok(Math.abs((feature.wallEndZ - feature.centerZ - 3.06) * 12 - 74.88) < 0.01, 'Stair-side continuous baseboard length');
  const livingWall = source.match(/\[0, livingFeatureWall\.wallEndZ, 0, 8, true, \[\.\.\.livingWindowCenters\]\.reverse\(\)\.map\(\(z\) => \[[^\]]*livingWindowSill, livingWindowHead\]\)\]/);
  assert.ok(livingWall, 'Living window wall keeps only sill-height openings, so base trim is not split by them');
});

test('double-chaise sectional has exactly chaise-seat-seat-chaise modules and fits the living area', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
    }
    add(child) { this.children.push(child); }
  }
  const scene = new Group();
  const context = {
    THREE: { Group }, scene, livingCenterZ: getLivingRoomFeatureLayout().centerZ, tanLeather: {}, tanLeatherCushion: {},
    box(parent, x, y, z, width, height, depth) {
      const mesh = { x, y, z, width, height, depth };
      parent.add(mesh);
      return mesh;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  const sectional ='), source.indexOf('  const livingChairWidth =')), context);
  const sectional = scene.children[0];
  const modules = sectional.children.filter((part) => part.userData);
  assert.deepEqual(modules.map((part) => part.userData.type), ['chaise', 'seat', 'seat', 'chaise']);
  assert.deepEqual(modules.map((part) => part.userData.moduleIndex), [0, 1, 2, 3]);
  assert.ok(modules.every((part, index) => index === 0 || part.x > modules[index - 1].x));
  assert.equal(modules[0].depth, modules[3].depth);
  assert.equal(modules[1].depth, modules[2].depth);
  assert.ok(Math.abs((modules[0].depth - modules[1].depth) * 12 - 26) < 1e-9);
  assert.equal(sectional.children.filter((part) => part.name === 'Sectional chaise extension').length, 2);
  const minX = Math.min(...sectional.children.map((part) => part.x - part.width / 2));
  const maxX = Math.max(...sectional.children.map((part) => part.x + part.width / 2));
  const minZ = Math.min(...sectional.children.map((part) => part.z - part.depth / 2));
  const maxZ = Math.max(...sectional.children.map((part) => part.z + part.depth / 2));
  assert.ok(Math.abs((maxX - minX) * 12 - 132) < 1e-9);
  assert.ok(Math.abs((maxZ - minZ) * 12 - 68) < 1e-9);
  assert.equal(Math.max(...sectional.children.map((part) => part.y + part.height / 2)) * 12, 36);
  assert.equal(sectional.rotation.y, -Math.PI / 2);
  assert.ok(sectional.position.x - maxZ - 1.38 > 3, 'Chaise tips leave more than three feet to fireplace face, not heat-clearance approval');
  assert.ok(sectional.position.x - minZ <= 13.2, 'Sectional back remains inside living area');
  assert.ok(sectional.position.z - maxX > getLivingRoomFeatureLayout().wallStartZ);
  assert.ok(sectional.position.z - minX < baseline.stairs.z, 'Sectional stays outside stair opening');
});

test('earlier sectional comparison restores visibility and obstacle flags when switching from the default', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  function object(children = []) {
    return {
      children, userData: {}, visible: true, position: { set() {} }, rotation: {},
      traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
    };
  }
  const cornerOttoman = object([object()]);
  const readingOttoman = object([object()]);
  const book = object();
  const context = {
    livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(),
    navigationMode: 'rotate', activeFloor: 'ground',
    sofa: object([object()]), sectional: object([object()]),
    downloadedSofa: object(), familySectional: object(), referenceLounge: object(), familyLiving: object(),
    livingArmchairs: [object([object()]), object([object()])],
    loungeChairs: [object([cornerOttoman]), object([readingOttoman, book])], cornerOttoman, readingOttoman,
    document: { querySelectorAll: () => [], getElementById: () => ({}) },
    viewport: { dataset: {} }, buildWalkObstacles() {}
  };
  const layouts = source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX ='));
  const apply = source.slice(source.indexOf('  function applyLivingLayout('), source.indexOf('  applyLivingLayout(livingLayouts[0], false);'));
  vm.runInNewContext(`${layouts}\n${apply}\nglobalThis.layouts = livingLayouts;`, context);
  assert.equal(context.layouts[0].id, 'reference-lounge');
  assert.equal(context.layouts[0].recommended, true);
  const current = context.layouts.find((layout) => layout.id === 'double-chaise');
  assert.equal(current.id, 'double-chaise');
  assert.ok(!current.recommended);
  assert.equal(current.sofa, null);
  assert.ok(current.chairs.every((chair) => chair === null));
  assert.equal(current.sectional[1], getLivingRoomFeatureLayout().centerZ);
  const previous = context.layouts.find((layout) => layout.id === 'centered');
  assert.ok(!previous.recommended);
  assert.equal(context.layouts.length, 10);
  for (const layout of [context.layouts[0], current, previous, current]) {
    context.applyLivingLayout(layout, false);
    const showingSectional = layout === current;
    assert.equal(context.sectional.visible, showingSectional);
    assert.equal(context.sofa.visible, layout === previous);
    assert.equal(context.referenceLounge.visible, layout === context.layouts[0]);
    for (const chair of context.livingArmchairs) {
      assert.equal(chair.visible, showingSectional);
      chair.traverse((part) => {
        assert.equal(part.userData.livingLayoutHidden, !showingSectional, 'Wing chairs block tours only in their active layout');
      });
    }
    for (const chair of context.loungeChairs) {
      assert.equal(chair.visible, layout === previous);
      chair.traverse((part) => {
        assert.equal(part.userData.livingLayoutHidden, layout !== previous, 'Hidden seating and descendants do not block tours');
      });
    }
    assert.equal(cornerOttoman.visible, layout === previous);
    assert.equal(readingOttoman.visible, layout === previous);
    assert.equal(context.sectional.children[0].userData.livingLayoutHidden, !showingSectional);
  }
});

test('earlier corner-chair comparison preserves centered fireplace and sofa', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const context = { getLivingRoomFeatureLayout };
  const feature = getLivingRoomFeatureLayout();
  const windowData = source.slice(source.indexOf('  const livingFeatureWall ='), source.indexOf('  const livingSideWindows ='));
  const layoutData = source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX ='));
  vm.runInNewContext(`${windowData}\n${layoutData}\nglobalThis.windows = livingWindowCenters; globalThis.layouts = livingLayouts;`, context);
  const midpoint = (context.windows[0] + context.windows[1]) / 2;
  const layout = context.layouts.find((option) => option.id === 'centered');
  assert.equal(layout.id, 'centered');
  assert.ok(!layout.recommended);
  assert.equal(feature.wallStartZ, 8.175);
  assert.equal(feature.wallEndZ, 26.775, 'Approved living composition remains fixed independently of stair gap closure');
  assert.equal(baseline.walls.find(([name]) => name === 'Living west')[4], feature.wallEndZ);
  assert.ok(Math.abs(midpoint - (feature.wallStartZ + feature.wallEndZ) / 2) < 1e-9);
  assert.ok(Math.abs(midpoint - 17.475) < 1e-9);
  assert.ok(Math.abs(feature.windowCenters[0] - 2 - feature.wallStartZ - 1.5) < 1e-9);
  assert.ok(Math.abs(feature.wallEndZ - feature.windowCenters[1] - 2 - 1.5) < 1e-9);
  assert.ok(Math.abs(layout.sofa[1] - midpoint) < 1e-9);
  assert.equal(layout.chairs[0][1], 10.9);
  assert.ok(Math.abs(layout.chairs[1][1] - (feature.wallEndZ - 2.175)) < 1e-9);
  assert.equal(layout.chairs[1][0], 2.9);
  assert.equal(layout.chairs[0][0], 3.6);
  for (const [index, chair] of layout.chairs.entries()) {
    assert.ok(Math.sin(chair[2]) > 0, 'Chair faces toward the sofa');
    assert.ok(Math.cos(chair[2]) * (index === 0 ? 1 : -1) > 0, 'Chair faces toward the conversation center');
    const halfWidth = (Math.abs(Math.cos(chair[2])) * 34 / 12 + Math.abs(Math.sin(chair[2])) * 34.5 / 12) / 2;
    const sofaFront = layout.sofa[0] - 46 / 24;
    assert.ok((sofaFront - chair[0] - halfWidth) * 12 >= 26, 'At least 26 inches between chair and sofa bounding envelopes');
  }
  assert.ok(context.layouts.every((option) => !('tables' in option)), 'No living layout restores the removed sofa-side table');
  assert.doesNotMatch(source, /livingTables|Square walnut sofa end table|Walnut end-table leg/, 'Removed table geometry and preview wiring stay absent');
  assert.equal(layout.sofa[0], 11.6);
  assert.equal(context.layouts.length, 10);
  const readingChair = layout.chairs[1];
  const halfDepth = (Math.abs(Math.sin(readingChair[2])) * 34 / 12 + Math.abs(Math.cos(readingChair[2])) * 34.5 / 12) / 2;
  assert.match(layout.note, /predating removal of the fireplace built-ins/);
  assert.doesNotMatch(layout.note, /wall-length cabinet/);
  assert.ok(readingChair[1] + halfDepth < feature.wallEndZ - 0.08, 'Reading-chair envelope clears the stair guard centerline');
  const cornerChair = layout.chairs[0];
  const halfWidth = (Math.abs(Math.cos(cornerChair[2])) * 34 / 12 + Math.abs(Math.sin(cornerChair[2])) * 34.5 / 12) / 2;
  const cornerHalfDepth = (Math.abs(Math.sin(cornerChair[2])) * 34 / 12 + Math.abs(Math.cos(cornerChair[2])) * 34.5 / 12) / 2;
  assert.ok(cornerChair[0] - halfWidth > 1.38, 'Corner chair clears the stone face plane');
  assert.ok(cornerChair[1] - cornerHalfDepth > feature.wallStartZ + 0.1, 'Corner chair clears the return-wall trim');
  const ottomanFrontX = cornerChair[0] + Math.sin(cornerChair[2]) * 2.7 + Math.abs(Math.cos(cornerChair[2])) + Math.abs(Math.sin(cornerChair[2])) * 20 / 24;
  assert.ok(ottomanFrontX < layout.sofa[0] - 46 / 24, 'New ottoman stays clear of the sofa');
  assert.ok(2.7 - 34.5 / 24 - 20 / 24 > 5 / 12, 'At least five inches between chair and ottoman');
});

test('matching chair ottomans use tan upholstery, scaled dimensions and follow their parent chairs', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() { this.children = []; this.position = {}; }
    add(child) { this.children.push(child); }
  }
  const context = {
    THREE: { Group }, oak: {}, tanLeather: {}, tanLeatherCushion: {},
    box(parent, x, y, z, width, height, depth, material) {
      const part = { x, y, z, width, height, depth, material };
      parent.add(part);
      return part;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function loungeOttoman('), source.indexOf('  const cornerOttoman =')), context);
  for (const chair of [new Group(), new Group()]) {
    const ottoman = context.loungeOttoman(chair);
    assert.equal(chair.children[0], ottoman);
    assert.equal(ottoman.position.z, 2.7);
    const cushion = ottoman.children.find((part) => part.name === 'Ottoman cushion');
    assert.equal(cushion.material, context.tanLeatherCushion);
    assert.equal(cushion.width * 12, ottoman.userData.widthInches);
    assert.equal(cushion.depth * 12, ottoman.userData.depthInches);
    assert.equal((cushion.y + cushion.height / 2) * 12, ottoman.userData.heightInches);
  }
});

test('first-floor baseline matches the furnished model floors and canonical wall openings', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const floors = [], walls = [];
  const context = {
    UpstairsLayout: layout, getGroundFloorDefaultPlan, getGroundFrontLayout, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout, getKitchenPassageLayout: require('../floor-plan-ground.js').getKitchenPassageLayout, getPrepWindowLayout: require('../floor-plan-ground.js').getPrepWindowLayout, getPrepWindowBankLayout: require('../floor-plan-ground.js').getPrepWindowBankLayout, ceilingHeight: 9, garageFloorY: -1.25, casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12,
    garageEntry: { x: 38, width: 3, height: 8 },
    garageFloorAreas: [{ x: 44.9 - 8 / 12, z: 15, w: 10.6 + 8 / 12, d: 11.9 }, { x: 31.2, z: 26.9, w: 24.3, d: 7.7 }, { x: 31.2, z: 34.6, w: 24.3, d: 14.4 }],
    scene: {}, shell: {},
    floor: (x, z, w, d) => floors.push([x, z, w, d]),
    wall: (x1, z1, x2, z2, furnished, openings = []) => walls.push([x1, z1, x2, z2, openings])
  };
  context.getKitchenWindowBankLayout = require('../floor-plan-ground.js').getKitchenWindowBankLayout;
  context.getGroundFrontWindows = require('../floor-plan-ground.js').getGroundFrontWindows;
  vm.runInNewContext(source.slice(source.indexOf('  const kitchenWallLeft ='), source.indexOf('  joinWallCorners();')), context);
  const round = (value) => JSON.parse(JSON.stringify(value, (key, number) => typeof number === 'number' ? Math.round(number * 1000000) / 1000000 : number));
  assert.deepEqual(round(baseline.floors.map(({ x, z, w, d }) => [x, z, w, d]).sort()), round(floors.sort()));
  const canonical = walls.map(([x1, z1, x2, z2, openings]) => {
    if (x2 < x1 || z2 < z1) {
      const length = Math.hypot(x2 - x1, z2 - z1);
      return [x2, z2, x1, z1, [...openings].reverse().map(([a, b, bottom, top]) => [length - b, length - a, bottom, top])];
    }
    return [x1, z1, x2, z2, openings];
  });
  const sortWalls = (items) => items.map(round).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(sortWalls(baseline.walls.map(([, x1, z1, x2, z2, openings = []]) => [x1, z1, x2, z2, openings])), sortWalls(canonical));
});

test('first-floor room edits move shared edges and preserve immutable baseline and openings', () => {
  const before = layout.serialize(baseline);
  const edits = layout.editRoom(baseline, layout.empty(), 'Living room', { w: 14.2 });
  const plan = layout.resolve(baseline, edits);
  assert.equal(plan.rooms.find((room) => room.name === 'Living room').w, 14.2);
  assert.equal(plan.rooms.find((room) => room.name === 'Hall').x, 14.2);
  assert.equal(plan.walls.find((wall) => wall.name === 'Living north').x2, 14.2);
  assert.equal(layout.serialize(baseline), before);
  for (const wall of plan.walls) {
    const original = baseline.walls.find(([name]) => name === wall.name);
    wall.openings.forEach(([a, b], index) => assert.ok(Math.abs(b - a - (original[5][index][1] - original[5][index][0])) < 0.001));
  }
  assert.deepEqual(layout.resolve(baseline, JSON.parse(layout.serialize(edits))), plan);
  const moved = layout.resolve(baseline, layout.editRoom(baseline, layout.empty(), 'Living room', { x: -0.5 }));
  assert.equal(moved.rooms.find((room) => room.name === 'Living room').x, -0.5);
  assert.equal(moved.rooms.find((room) => room.name === 'Living room').w, 13.2);
});

test('first-floor walls move in both axes, change thickness and keep joins', () => {
  const edits = layout.editWall(baseline, layout.empty(), 'Kids north', { z1: 25.2, z2: 25.2, thickness: 0.5 });
  const plan = layout.resolve(baseline, edits);
  assert.equal(plan.walls.find((wall) => wall.name === 'Kids west').z1, 25.2);
  assert.equal(plan.rooms.find((room) => room.name === 'Kids room').z, 25.2);
  assert.equal(plan.walls.find((wall) => wall.name === 'Kids north').thickness, 0.5);
  const horizontalMove = layout.editWall(baseline, layout.empty(), 'Office north', { x1: 0.25, x2: 12.45 });
  assert.equal(layout.resolve(baseline, horizontalMove).walls.find((wall) => wall.name === 'Office north').x1, 0.25);
});

test('first-floor stairs, opening widths and schema remain protected', () => {
  assert.throws(() => layout.editRoom(baseline, layout.empty(), 'Kids room', { x: 1 }), /stair/);
  assert.throws(() => layout.editWall(baseline, layout.empty(), 'Kids north', { x1: 1, x2: 11, z1: 28, z2: 28 }), /stair/);
  assert.throws(() => layout.editWall(baseline, layout.empty(), 'Living north', { x2: 2 }), /opening/);
  assert.throws(() => layout.resolve(baseline, { version: 1, rooms: [], walls: [{ name: 'unknown' }] }), /Unknown/);
  assert.deepEqual(layout.resolve(baseline, layout.empty()).rooms, baseline.rooms);
  assert.deepEqual(layout.warnings(baseline, layout.empty()), []);
});

test('irregular garage floors and porch follow their room bounds without filling the mudroom', () => {
  const plan = layout.resolve(baseline, layout.empty());
  assert.equal(plan.floors.filter((floor) => floor.room === 'Garage').length, 3);
  const edits = layout.editRoom(baseline, layout.empty(), 'Front porch', { d: 8 });
  assert.equal(layout.resolve(baseline, edits).floors.find((floor) => floor.room === 'Front porch').d, 8);
  const garage = layout.editRoom(baseline, layout.empty(), 'Garage', { w: 27.5 });
  assert.ok(Math.abs(layout.resolve(baseline, garage).rooms.find((room) => room.name === 'Garage').w - 27.5) < 1e-9);
});
