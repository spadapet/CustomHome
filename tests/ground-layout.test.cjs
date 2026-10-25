'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGroundFloorDefaultPlan, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout } = require('../floor-plan-ground.js');
const baseline = getGroundFloorDefaultPlan();

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
  for (const door of [entry.powderDoor, entry.closetDoor, suite.closetDoor, suite.bathroomDoor, suite.shower]) assert.equal(door.height, 8);
});

test('guest suite retains a walk-in closet alongside the comfortable shower', () => {
  const suite = getGuestSuiteLayout();
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
  const bathroom = baseline.rooms.find((room) => room.name === 'Bathroom');
  assert.deepEqual(bathroom, { name: 'Bathroom', ...suite.bathroom });
  const guestRoom = baseline.rooms.find((room) => room.name === 'Guest room');
  assert.equal(guestRoom.x, 19);
  assert.equal(guestRoom.z, 43);
  assert.equal(guestRoom.w, 12.2);
  close(guestRoom.d, 11.2);
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Guest room entry'), { name: 'Guest room entry', x: 19, z: 42, w: 5.5, d: 1 });
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Closet'), { name: 'Closet', ...suite.closet });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Laundry'));
  assert.ok(!baseline.walls.some(([name]) => name === 'Laundry north'));
  close(baseline.floors.filter((floor) => ['Closet', 'Bathroom', 'Guest sink alcove', 'Guest room', 'Guest room entry'].includes(floor.room)).reduce((area, floor) => area + floor.w * floor.d, 0), 12.2 * 19.6);
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Guest sink alcove'), { name: 'Guest sink alcove', ...suite.sinkAlcove });
  close(suite.bathroom.z + suite.bathroom.d, suite.sinkAlcove.z);
  close(suite.sinkAlcove.z + suite.sinkAlcove.d, guestRoom.z);
  const privacyWall = baseline.walls.find(([name]) => name === 'Guest vanity privacy return');
  assert.equal(privacyWall.length, 5, 'Privacy return has no opening or spanning header');
  privacyWall.slice(1).forEach((coordinate, index) => close(coordinate, [29.3225, 43.2, 31.2, 43.2][index]));
  close(suite.vanityPrivacyWall.x - 0.75 / 12, suite.vanity.x - (0.79 + 0.1 + 0.1 / 2));
  close(suite.vanityPrivacyWall.w * 12, 22.53);
  close((suite.vanityPrivacyWall.x - 0.75 / 12 - suite.sinkAlcove.x - 0.175) * 12, 55.02);
  assert.ok(suite.vanity.z + (suite.vanity.width + 0.06) / 2 < suite.vanityPrivacyWall.z - 0.175 - 0.75 / 12, 'Counter clears privacy-wall baseboard');
  assert.ok(!baseline.walls.some(([, x1, z1, x2, z2]) => z1 === z2 && z1 >= 43 && z1 <= 43.4 && Math.min(x1, x2) < suite.vanityPrivacyWall.x), 'No wall, door or header extends past vanity front or spans the open west passage');
  for (const [name, door, west, east] of [
    ['Closet south', suite.closetDoor, 19, 24.5],
    ['Bathroom south', suite.bathroomDoor, 24.5, 31.2]
  ]) {
    const wall = baseline.walls.find(([wallName]) => wallName === name);
    close(wall[1] + wall[5][0][0], door.x);
    close(wall[1] + wall[5][0][1], door.x + door.width);
    close(wall[2], door.z);
    close(door.width * 12, 30);
    const casing = (3.5 + 0.125) / 12;
    assert.ok(door.x - west - 0.175 >= casing);
    assert.ok(east - 0.175 - door.x - door.width >= casing);
  }
  close(suite.shower.clearWidth * 12, 53.4);
  close(suite.shower.clearDepth * 12, 36);
  close((suite.shower.w - 0.2) * 12, 53.4);
  close((suite.shower.d - 0.2) * 12, 36);
  assert.equal(suite.shower.rotation, -Math.PI / 2);
  close(suite.shower.x, suite.bathroom.x + suite.bathroom.w - 0.175);
  close(suite.shower.z + suite.shower.w, suite.bathroomDoor.z - 0.175);
  assert.equal(suite.vanity.basinCount, 1);
  close(suite.vanity.width * 12, 36);
  assert.ok(suite.vanity.z - (suite.vanity.width + 0.06) / 2 > suite.bathroomDoor.z + 0.175, 'Vanity counter clears the partition');
  assert.ok(suite.vanity.z + (suite.vanity.width + 0.06) / 2 < 43, 'Vanity stays within sink alcove');
  assert.ok(suite.toilet.x + 0.875 < suite.shower.x - suite.shower.d, 'Toilet sits west of the shower');
  assert.ok(suite.toilet.z - 1.1 >= suite.bathroom.z + 0.175, 'Toilet tank clears north wall');
  assert.ok(suite.toilet.z + 0.848 < suite.bathroomDoor.z - 0.175, 'Toilet stays entirely in enclosed bathroom');
  assert.equal(suite.toilet.rotation, 0);
  close(suite.closet.d, 7.4);
  close(suite.closet.w, 5.5);
  close((suite.closet.w - 0.35 - 2 - 0.15) * 12, 36);
  assert.equal(suite.closetDoor.doorless, true);
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Entry hall'), { name: 'Entry hall', x: 12.2, z: 34.6, w: 6.8, d: 19.6 });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Closet hall'), 'No narrowed north hall remains');
  for (const zone of [...suite.closetStorage.hanging, suite.closetStorage.shelves]) assert.ok(zone.x >= 0 && zone.x + zone.w <= 6.75 && zone.z + zone.d <= 2, 'Extended storage stays inside the closet');
  close((suite.closetStorage.hanging[0].w - 2.8) * 12, 9.96);
  const storageNorthZ = suite.closet.z + suite.closet.d - 0.325 - suite.closetStorage.shelves.x - suite.closetStorage.shelves.w;
  const northShoeEdgeZ = suite.closet.z + 0.175 + 0.125;
  close((storageNorthZ - northShoeEdgeZ) * 12, 0.3);
  assert.equal(baseline.walls.find(([name]) => name === 'Guest west')[1], 19);
  assert.deepEqual(baseline.walls.find(([name]) => name === 'Garage west').slice(1), [31.2, 34.6, 31.2, 49]);
});

test('furnished guest suite uses walk-in fittings and sliding doors without a bathroom swing', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
      this.userData = {};
    }
    add(child) { this.children.push(child); }
  }
  const items = [];
  const context = {
    THREE: { Group, PointLight: class { constructor() { this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; } } }, guestSuite: getGuestSuiteLayout(),
    windowTrim: {}, cream: {}, brass: {}, porcelain: {}, countertop: {}, glass: {}, steel: {}, oak: {}, linen: {}, powderGlow: {}, cabinetFinish: {},
    shakerFront(parent, x, y, z, width, height) {
      const front = new Group();
      front.position.set(x, y, z);
      front.userData = { width, height };
      parent.add(front);
      return front;
    },
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
  vm.runInNewContext(source.slice(source.indexOf('  function vanity('), source.indexOf('  const powderStone =')), context);
  vm.runInNewContext(source.slice(source.indexOf("  const wardrobe = furnishing("), source.indexOf("  const guestCoats =")), context);
  vm.runInNewContext(source.slice(source.indexOf("  tiledFloor('Guest bathroom tile'"), source.indexOf("  const frontDoor =")), context);
  const suite = context.guestSuite;
  const find = (name) => items.find((item) => item.name === name);
  const wardrobe = find('Guest walk-in closet fittings');
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous long-hang rail').length, 1);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous short-hang rail').length, 2);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest wardrobe folded-clothes shelf').length, 5);
  const hangingShelves = wardrobe.children.filter((part) => part.name === 'Guest closet hanging-zone upper shelf');
  assert.equal(hangingShelves.length, 2);
  assert.equal(wardrobe.rotation.y, Math.PI / 2);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest wardrobe sliding Shaker front').length, 0);
  assert.equal(wardrobe.userData.minimumAisleAtTrimInches, 36);
  assert.deepEqual(find('Guest bathroom tile'), { name: 'Guest bathroom tile', ...suite.bathroom });
  assert.equal(find('Guest bathroom vanity').x, suite.vanity.x);
  assert.equal(find('Guest bathroom vanity').z, suite.vanity.z);
  assert.equal(find('Guest bathroom vanity').userData.widthInches, 36);
  assert.equal(find('Guest bathroom vanity').rotation.y, suite.vanity.rotation);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity basin \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity faucet spout \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').children.filter((part) => /^Guest bathroom vanity mirror \d$/.test(part.name)).length, 1);
  assert.equal(find('Guest bathroom vanity').userData.basinCenterSpacingInches, 0);
  const basin = find('Guest bathroom vanity').children.find((part) => part.name === 'Guest bathroom vanity basin 1');
  const mirror = find('Guest bathroom vanity').children.find((part) => part.name === 'Guest bathroom vanity mirror 1');
  assert.equal(basin.x, 0);
  assert.equal(basin.w * 12, 21);
  assert.equal(mirror.x, 0);
  assert.equal(mirror.w * 12, 30);
  assert.equal(find('Guest bathroom vanity').userData.mirrorWidthInches, 30);
  const vanity = find('Guest bathroom vanity');
  const cabinetDoor = vanity.children.filter((part) => part.name === 'Guest vanity left cabinet door');
  const drawers = vanity.children.filter((part) => /^Guest vanity right pull-out drawer \d$/.test(part.name));
  assert.equal(cabinetDoor.length, 1);
  assert.equal(drawers.length, 3);
  assert.equal(vanity.userData.doorBayWidthInches, 24);
  assert.equal(vanity.userData.drawerBankWidthInches, 12);
  assert.ok(cabinetDoor[0].position.x < 0, 'Door is left when facing sink, not left on the floor plan');
  assert.equal(cabinetDoor[0].userData.width, 1.96);
  assert.deepEqual(drawers.map((drawer) => drawer.position.y), [0.75, 1.5, 2.25]);
  for (const drawer of drawers) {
    assert.ok(drawer.position.x > 0, 'Every drawer is on the right when facing sink');
    assert.equal(drawer.userData.shownClosed, true);
    assert.equal(drawer.userData.travelFeet, 1.25);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer bottom').length, 1);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer side').length, 2);
    assert.equal(drawer.children.filter((part) => part.name === 'Guest vanity drawer end').length, 2);
    const front = drawer.children.find((part) => part.name === 'Guest vanity drawer Shaker front');
    assert.equal(front.userData.width, 0.96);
    const bottom = drawer.children.find((part) => part.name === 'Guest vanity drawer bottom');
    assert.ok(drawer.position.x - bottom.w / 2 > 0.5 + 0.75 / 24, 'Drawer box clears cupboard divider');
    assert.ok(drawer.position.x + bottom.w / 2 < suite.vanity.width / 2 - 0.75 / 12, 'Drawer box clears cabinet side');
    assert.ok(suite.vanity.z + drawer.position.x + front.userData.width / 2 < suite.vanityPrivacyWall.z - 0.175 - 0.75 / 12, 'Right drawers clear privacy-wall baseboard');
  }
  assert.equal((suite.vanity.width - basin.w) * 6, 7.5, 'Counter remains on each side of the centered sink');
  assert.equal(find('Guest bathroom toilet').x, suite.toilet.x);
  assert.equal(find('Guest bathroom toilet').z, suite.toilet.z);
  assert.equal(find('Guest bathroom toilet').rotation, 0);
  assert.equal(find('Guest bathroom shower').rotation.y, -Math.PI / 2);
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
  for (const name of ['Guest shower drain', 'Guest shower rain head', 'Guest shower mixer control', 'Guest shower fixed southwest glass', 'Guest shower fixed southeast glass', 'Guest shower fixed east glass']) {
    assert.ok(shower.children.some((part) => part.name === name), name);
  }
  assert.equal(shower.userData.entryType, 'Open walk-in, fixed splash glass only');
  assert.equal(shower.userData.slidingDoor, false);
  assert.equal(shower.children.some((part) => part.name.includes('sliding glass door')), false);
  const westGlass = shower.children.find((part) => part.name === 'Guest shower fixed southwest glass');
  const eastGlass = shower.children.find((part) => part.name === 'Guest shower fixed southeast glass');
  const entranceNorth = suite.shower.z + westGlass.x + westGlass.w / 2;
  const entranceSouth = suite.shower.z + eastGlass.x - eastGlass.w / 2;
  assert.ok(Math.abs((entranceSouth - entranceNorth) * 12 - 30) < 1e-9, 'Rotated fixed-glass edges form a 30-inch west-facing entry');
  assert.equal(westGlass.h, suite.shower.height);
  assert.equal(eastGlass.h, suite.shower.height);
  const routeObstacles = [
    { left: suite.toilet.x - 0.875, right: suite.toilet.x + 0.875, north: suite.toilet.z - 1.1, south: suite.toilet.z + 0.848 },
    { left: suite.vanity.x - 0.9525, right: suite.vanity.x + 0.775, north: suite.vanity.z - (suite.vanity.width + 0.06) / 2, south: suite.vanity.z + (suite.vanity.width + 0.06) / 2 },
    { left: 24.325, right: suite.bathroomDoor.x, north: 39.425, south: 39.775 },
    { left: suite.bathroomDoor.x + suite.bathroomDoor.width, right: 31.375, north: 39.425, south: 39.775 },
    { left: suite.vanityPrivacyWall.x, right: 31.375, north: suite.vanityPrivacyWall.z - 0.175 - 0.75 / 12, south: suite.vanityPrivacyWall.z + 0.175 + 0.75 / 12 },
    { left: suite.vanity.x - 0.94 - 1.25, right: suite.vanity.x, north: suite.vanity.z + 0.52, south: suite.vanity.z + 1.48 }
  ];
  for (const part of shower.children.filter((part) => part.name.includes('fixed south'))) {
    routeObstacles.push({ left: shower.x - part.z - part.d / 2, right: shower.x - part.z + part.d / 2, north: shower.z + part.x - part.w / 2, south: shower.z + part.x + part.w / 2 });
  }
  const route = [[26.25, 44], [26.25, 38.05], [29.4, 38.05]];
  for (let index = 1; index < route.length; index++) {
    const [x0, z0] = route[index - 1], [x1, z1] = route[index];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.05);
    for (let step = 0; step <= steps; step++) {
      const x = x0 + (x1 - x0) * step / steps, z = z0 + (z1 - z0) * step / steps;
      assert.ok(routeObstacles.every((item) => Math.hypot(Math.max(item.left - x, 0, x - item.right), Math.max(item.north - z, 0, z - item.south)) >= 28 / 24 - 1e-9), `28-inch route blocked at ${x}, ${z}`);
    }
  }
  assert.ok(38.05 - 28 / 24 >= entranceNorth && 38.05 + 28 / 24 <= entranceSouth, 'Route turns through the actual west-facing shower entry');
  assert.equal(find('Guest walk-in closet inward-opening door'), undefined);
  const opening = suite.bathroomDoor;
  const door = find('Guest bathroom pocket door proposal - framing approval required');
  assert.equal(door.rotation.y, 0);
  assert.equal(door.z, opening.z);
  assert.equal(door.userData.approvalRequired, true);
  assert.equal(door.userData.nominalWidthInches, 30);
  assert.equal(door.userData.targetClearWidthInches, 28);
  assert.equal(door.userData.heightInches, 96);
  const leaf = door.children.find((part) => part.name === 'Guest bathroom painted-white pocket leaf');
  assert.equal(leaf.h, opening.height - 0.04);
  assert.equal(leaf.y, opening.height / 2);
  assert.ok(door.userData.openCenterX - leaf.w / 2 >= opening.pocket.x);
  assert.ok(door.userData.openCenterX - leaf.w / 2 >= opening.x + opening.width, 'Fully retracted leaf clears the passage to the east');
  assert.ok(door.userData.openCenterX + leaf.w / 2 <= opening.pocket.x + opening.pocket.w);
  assert.ok(opening.pocket.x + opening.pocket.w < suite.bathroom.x + suite.bathroom.w - 0.175, 'Pocket stays within partition, outside closet and garage');
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
  assert.ok(entry.officeNorthZ - 0.175 - entry.powderDoor.z - entry.powderDoor.width > casingWidth, 'South jamb has room for the casing and reveal');
  assert.ok(!baseline.walls.some(([, x1, z1, x2, z2]) => x1 === 12.2 && x2 === 12.2 && Math.min(z1, z2) < entry.officeNorthZ && Math.max(z1, z2) > entry.alcove.z), 'No wall blocks the hall-facing alcove');
  const sharedArea = baseline.floors.filter((floor) => ['Powder room', 'Guest coat closet', 'Guest entry alcove', 'Office'].includes(floor.room)).reduce((sum, floor) => sum + floor.w * floor.d, 0);
  close(sharedArea, 12.2 * (54.2 - 35.1));
  close(baseline.rooms.find((room) => room.name === 'Office').d, 13.2);
  assert.ok(entry.vanity.z + entry.vanity.depth / 2 + 0.2 < entry.powderDoor.z, 'North-wall vanity stays north of the entire door opening');
});

test('powder redesign aligns fixtures north and leaves their approaches clear of the entry sweep', () => {
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
    assert.ok(entry.powderDoor.x - projectionX > entry.toilet.x + 0.875, 'Entire door sweep stays east of the toilet');
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
  const context = {
    THREE: { Group }, scene: new Group(), windowTrim: {}, windowExterior: {}, glass: {}, privacyGlass: {},
    openingCasing() {},
    box(parent, x, y, z, width, height, depth, material) {
      const part = { x, y, z, width, height, depth, material };
      parent.add(part);
      return part;
    }
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  function windowFrame('), source.indexOf('  for (const { name, center, width, picture }')), context);
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const exteriorContext = { ...context, glass: {}, privacyGlass: {}, windowBlack: {} };
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
    assert.equal(frame.userData.standardSizeVerified, true);
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
    guestEntry: getGuestEntryLayout(), powderNorthZ: getGuestEntryLayout().powder.z, rest: new Group(),
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
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
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

test('powder-wall-backed upper flight and landing omit guards without removing stringers or exposed-edge rails', () => {
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
    THREE: { Group }, stairs: new Group(),
    stairWidth, stairGap, stairDepth, stairRun, wallSideStairWidth: stairDepth - stairWidth - stairGap,
    stairRisers: 8, stairRise: 7.5 / 12, stairGoing: 10 / 12, landingHeight: 5, landingEndX: stairRun + 4,
    stairBookcaseDepth: 11 / 12, stairBookcaseFlightSplitStep: 5,
    oak: {}, walnut: {}, cream: {}, black: {}, wallMaterial: {},
    stairBookcaseHeight() { return 0; },
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
  for (const part of parts.filter((part) => /handrail|guard/.test(part.name))) {
    const z = part.start ? part.start[2] : part.z;
    assert.ok(Math.abs(z - stairDepth - 0.08) > 1e-9, 'No rail or post remains against the powder-room wall');
  }
  const landingRail = parts.find((part) => part.name === 'Turning landing side handrail');
  assert.equal(landingRail.start[2], -0.08, 'Opposite exposed landing edge remains guarded');
});

test('kitchen-facing kids-room wall is flush with the tall cabinet fronts without moving the doorway', () => {
  const wall = baseline.walls.find(([name]) => name === 'Kids north');
  const room = baseline.rooms.find((room) => room.name === 'Kids room');
  const cabinetFrontZ = 26.725 - 25 / 12 - 0.08;
  assert.ok(Math.abs(wall[2] - 0.175 - cabinetFrontZ) < 1e-9);
  assert.ok(Math.abs((25.7 - wall[2]) * 12 - 11.56) < 1e-9);
  assert.ok(Math.abs(room.z + room.d - 34.6) < 1e-9);
  const west = baseline.walls.find(([name]) => name === 'Kids west');
  assert.ok(Math.abs(west[2] + west[5][0][0] - 27) < 1e-9);
  assert.ok(Math.abs(west[2] + west[5][0][1] - 31.5) < 1e-9);
  for (const floor of baseline.floors.filter((floor) => ['Hall', 'Kitchen'].includes(floor.room))) {
    const overlapX = Math.min(floor.x + floor.w, room.x + room.w) - Math.max(floor.x, room.x);
    const overlapZ = Math.min(floor.z + floor.d, room.z + room.d) - Math.max(floor.z, room.z);
    assert.ok(overlapX < 1e-9 || overlapZ < 1e-9, 'Floor slabs meet without overlapping the expanded kids room');
  }
});

test('closed media cabinets adjoin both fireplace sides with no projection beyond the stone face', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = {};
    }
    add(child) { this.children.push(child); }
  }
  const scene = new Group();
  const context = {
    THREE: { Group }, scene, livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(), fireplaceFaceX: 1.38,
    cabinetFinish: {}, cabinetRailFinish: {}, black: {},
    box(parent, x, y, z, width, height, depth) {
      const mesh = { x, y, z, width, height, depth, userData: {} };
      parent.add(mesh);
      return mesh;
    },
    shakerFront(parent, x, y, z, width, height) {
      const front = new Group();
      Object.assign(front, { x, y, z, width, height });
      parent.add(front);
      return front;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  const mediaBuiltIns ='), source.indexOf('  const livingSconces =')), context);
  assert.equal(scene.children.length, 2, 'One built-in on each side');
  assert.ok(Math.abs((scene.children[0].position.z + scene.children[1].position.z) / 2 - context.livingCenterZ) < 1e-9, 'Pair is symmetric about the fireplace');
  scene.children.forEach((cabinet, index) => {
    assert.ok(Math.abs(cabinet.userData.widthInches - 74.88) < 1e-9);
    assert.ok(Math.abs(cabinet.userData.depthInches - 11.76) < 1e-9);
    assert.equal(cabinet.userData.heightInches, 26);
    const side = index === 0 ? -1 : 1;
    const innerEdge = cabinet.position.z - side * cabinet.userData.widthInches / 24;
    assert.ok(Math.abs(innerEdge - (context.livingCenterZ + side * (3.03 + 0.06 / 2))) < 1e-9, 'Inner edge touches the actual stone side return without a gap or overlap');
    assert.notEqual(cabinet.position.z, getLivingRoomFeatureLayout().windowCenters[index], 'Cabinet is not centered under the window');
    assert.equal(cabinet.rotation.y, Math.PI / 2);
    const rearEdge = cabinet.position.x - cabinet.userData.depthInches / 24;
    assert.ok(Math.abs(rearEdge - 0.4) < 1e-9);
    assert.ok(rearEdge > 0.175 + 0.075, 'Rear edge clears wall baseboard and shoe');
    assert.ok(26 / 12 < 2.6 - 1 / 12 - 3.5 / 12, 'Top clears the sill and apron');
    const outerEdge = cabinet.position.z + side * cabinet.userData.widthInches / 24;
    assert.ok(Math.abs(outerEdge - (side === -1 ? context.livingFeatureWall.wallStartZ : baseline.stairs.z)) < 1e-9, 'Cabinet reaches its wall end without extending into the return or stair opening');
    assert.equal(cabinet.userData.openBack, true);
    assert.equal(cabinet.userData.openFront, false);
    assert.equal(cabinet.userData.clearanceVerified, false);
    const doors = cabinet.children.filter((child) => child.name === 'Closed media cabinet Shaker door');
    assert.equal(doors.length, 4, 'Four appropriately sized cabinet doors are closed');
    for (const door of doors) {
      assert.ok(Math.abs(door.width - (cabinet.userData.widthInches / 48 - 0.04)) < 1e-9, 'Door widths follow the full cabinet run');
      assert.ok(Math.abs(cabinet.position.x + door.z + 0.04 - context.fireplaceFaceX) < 1e-9, 'Outermost door rail is flush with stone');
      assert.match(door.userData.hardware, /Concealed push latch/);
    }
    for (const part of cabinet.children.filter((child) => !(child instanceof Group))) {
      assert.ok(cabinet.position.x + part.z + part.depth / 2 <= context.fireplaceFaceX + 1e-9, `${part.name} does not project beyond the fireplace`);
      assert.ok(part.y + part.height / 2 <= 26 / 12 + 1e-9, 'No devices or chargers displayed on top');
    }
    assert.ok(cabinet.children.some((child) => child.name === 'Concealed equipment and charging shelf'));
    const top = cabinet.children.find((child) => child.name === 'Clear oak cabinet top flush with fireplace');
    assert.ok(Math.abs(top.width * 12 - 74.88) < 1e-9, 'Actual top spans the complete cabinet run');
    assert.ok(cabinet.children.some((child) => child.name === 'Media cabinet center support'));
    assert.ok(!cabinet.children.some((child) => /Xbox|Switch|Laptop|Phone|Tablet|hub|drawer/i.test(child.name)), 'No exposed electronics or drawer fronts');
  });
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
  vm.runInNewContext(source.slice(source.indexOf('  const sectional ='), source.indexOf('  const strandmonWidth =')), context);
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

test('sectional default replaces chairs and sofa, and comparison switching restores visibility and obstacle flags', () => {
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
    strandmonChairs: [object([object()]), object([object()])],
    loungeChairs: [object([cornerOttoman]), object([readingOttoman, book])], cornerOttoman, readingOttoman,
    document: { querySelectorAll: () => [], getElementById: () => ({}) },
    viewport: { dataset: {} }, buildWalkObstacles() {}
  };
  const layouts = source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX ='));
  const apply = source.slice(source.indexOf('  function applyLivingLayout('), source.indexOf('  applyLivingLayout(livingLayouts[0], false);'));
  vm.runInNewContext(`${layouts}\n${apply}\nglobalThis.layouts = livingLayouts;`, context);
  const current = context.layouts[0];
  assert.equal(current.id, 'double-chaise');
  assert.equal(current.recommended, true);
  assert.equal(current.sofa, null);
  assert.ok(current.chairs.every((chair) => chair === null));
  assert.equal(current.sectional[1], getLivingRoomFeatureLayout().centerZ);
  const previous = context.layouts.find((layout) => layout.id === 'centered');
  assert.ok(!previous.recommended);
  assert.equal(context.layouts.length, 6);
  for (const layout of [current, previous, current]) {
    context.applyLivingLayout(layout, false);
    const showingSectional = layout === current;
    assert.equal(context.sectional.visible, showingSectional);
    assert.equal(context.sofa.visible, !showingSectional);
    for (const chair of context.strandmonChairs) {
      assert.equal(chair.visible, showingSectional);
      chair.traverse((part) => {
        assert.equal(part.userData.livingLayoutHidden, !showingSectional, 'Wing chairs block tours only in their active layout');
      });
    }
    for (const chair of context.loungeChairs) {
      assert.equal(chair.visible, !showingSectional);
      chair.traverse((part) => {
        assert.equal(part.userData.livingLayoutHidden, showingSectional, 'Hidden seating and descendants do not block tours');
      });
    }
    assert.equal(cornerOttoman.visible, !showingSectional);
    assert.equal(readingOttoman.visible, !showingSectional);
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
  assert.equal(feature.wallEndZ, baseline.stairs.z);
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
  assert.equal(context.layouts.length, 6);
  const readingChair = layout.chairs[1];
  const halfDepth = (Math.abs(Math.sin(readingChair[2])) * 34 / 12 + Math.abs(Math.cos(readingChair[2])) * 34.5 / 12) / 2;
  const cabinetEndZ = feature.wallEndZ;
  assert.ok(readingChair[1] - halfDepth < cabinetEndZ, 'Earlier reading-chair pose now shares the extended cabinet zone');
  assert.match(layout.note, /conflicts with the new wall-length cabinet/);
  assert.ok(readingChair[1] + halfDepth < feature.wallEndZ - 0.08, 'Reading-chair envelope clears the stair guard centerline');
  const cornerChair = layout.chairs[0];
  const halfWidth = (Math.abs(Math.cos(cornerChair[2])) * 34 / 12 + Math.abs(Math.sin(cornerChair[2])) * 34.5 / 12) / 2;
  const cornerHalfDepth = (Math.abs(Math.sin(cornerChair[2])) * 34 / 12 + Math.abs(Math.cos(cornerChair[2])) * 34.5 / 12) / 2;
  assert.ok(cornerChair[0] - halfWidth > 1.38, 'Corner chair clears the closed cabinet front');
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
    UpstairsLayout: layout, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout, ceilingHeight: 9, garageFloorY: -1.25, casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12,
    garageEntry: { x: 39.5, width: 3, height: 8 },
    garageFloorAreas: [{ x: 44.9 - 2 / 12, z: 15, w: 10.6 + 2 / 12, d: 11.9 }, { x: 29, z: 26.9, w: 26.5, d: 7.7 }, { x: 31.2, z: 34.6, w: 24.3, d: 14.4 }],
    scene: {}, shell: {},
    floor: (x, z, w, d) => floors.push([x, z, w, d]),
    wall: (x1, z1, x2, z2, furnished, openings = []) => walls.push([x1, z1, x2, z2, openings])
  };
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
  assert.deepEqual(round(baseline.walls.map(([, x1, z1, x2, z2, openings = []]) => [x1, z1, x2, z2, openings])), round(canonical));
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
  assert.equal(layout.resolve(baseline, garage).rooms.find((room) => room.name === 'Garage').w, 27.5);
});
