'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGroundFloorDefaultPlan, getLivingRoomFeatureLayout, getGuestEntryLayout, getGuestSuiteLayout } = require('../floor-plan-ground.js');
const baseline = getGroundFloorDefaultPlan();

test('guest suite has independent bedroom entries, a walk-in closet and a shower bathroom', () => {
  const suite = getGuestSuiteLayout();
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
  const bathroom = baseline.rooms.find((room) => room.name === 'Bathroom');
  assert.deepEqual(bathroom, { name: 'Bathroom', ...suite.bathroom });
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Guest room'), { name: 'Guest room', x: 19, z: 42, w: 12.2, d: 12.2 });
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Closet'), { name: 'Closet', ...suite.closet });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Laundry'));
  assert.ok(!baseline.walls.some(([name]) => name === 'Laundry north'));
  close(baseline.floors.filter((floor) => ['Closet', 'Bathroom'].includes(floor.room)).reduce((area, floor) => area + floor.w * floor.d, 0), 12.2 * 7.4);
  for (const [name, door, west, east] of [
    ['Closet south', suite.closetDoor, 19, 25],
    ['Bathroom south', suite.bathroomDoor, 25, 31.2]
  ]) {
    const wall = baseline.walls.find(([wallName]) => wallName === name);
    close(wall[1] + wall[5][0][0], door.x);
    close(wall[1] + wall[5][0][1], door.x + door.width);
    close(wall[2], 42);
    close(door.width * 12, 30);
    const casing = (3.5 + 0.125) / 12;
    assert.ok(door.x - west - 0.175 >= casing);
    assert.ok(east - 0.175 - door.x - door.width >= casing);
  }
  close(suite.shower.clearWidth * 12, 36);
  close(suite.shower.clearDepth * 12, 48);
  close((suite.shower.w - 0.2) * 12, 36);
  close((suite.shower.d - 0.2) * 12, 48);
  assert.ok(suite.toilet.x - (suite.shower.x + suite.shower.w) >= 15 / 12, 'Toilet center clears shower side by 15 inches');
  assert.ok(bathroom.x + bathroom.w - 0.175 - suite.toilet.x >= 15 / 12, 'Toilet center clears east wall by 15 inches');
  assert.ok(suite.vanity.x + 1 <= suite.shower.x + suite.shower.w, 'Vanity is west of the entire toilet approach, not in its narrow corridor');
  assert.ok(suite.bathroomDoor.z - (suite.toilet.z + 0.85) >= 21 / 12, 'Toilet front has at least 21 inches free toward the entrance');
  assert.ok(suite.vanity.z + (suite.vanity.width + 0.06) / 2 <= 42 - 0.175 - 1.5 / 12, 'Vanity clears south baseboard');
  const [north, south] = suite.closetStorage.hanging;
  close((south.z - north.z - north.d) * 12, 36.6);
  assert.equal(suite.closetDoor.doorless, true);
  assert.ok(suite.closetDoor.x + suite.closetDoor.width < south.x, 'Doorless entry stays beside, not inside, front hanging');
  assert.deepEqual(baseline.rooms.find((room) => room.name === 'Entry hall'), { name: 'Entry hall', x: 12.2, z: 34.6, w: 6.8, d: 19.6 });
  assert.ok(!baseline.rooms.some((room) => room.name === 'Closet hall'), 'No narrowed north hall remains');
  for (const zone of [...suite.closetStorage.hanging, suite.closetStorage.shelves]) assert.ok(zone.x >= 19.175 && zone.x + zone.w <= 24.825, 'All closet storage stays inside original walls, out of the hall');
  assert.equal(baseline.walls.find(([name]) => name === 'Guest west')[1], 19);
  assert.deepEqual(baseline.walls.find(([name]) => name === 'Garage west').slice(1), [31.2, 34.6, 31.2, 49]);
});

test('furnished guest suite uses the shared fixtures, shower enclosure and inward doors', () => {
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
    THREE: { Group }, guestSuite: getGuestSuiteLayout(),
    windowTrim: {}, cream: {}, brass: {}, porcelain: {}, countertop: {}, glass: {}, steel: {}, oak: {}, linen: {},
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
    vanity(name, x, z, width, rotation) { items.push({ name, x, z, width, rotation }); },
    toilet(name, x, z) { items.push({ name, x, z }); }
  };
  vm.runInNewContext(source.slice(source.indexOf("  const wardrobe = furnishing("), source.indexOf("  const guestCoats =")), context);
  vm.runInNewContext(source.slice(source.indexOf("  tiledFloor('Guest bathroom tile'"), source.indexOf("  const frontDoor =")), context);
  const suite = context.guestSuite;
  const find = (name) => items.find((item) => item.name === name);
  const wardrobe = find('Walk-in closet fittings');
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous long-hang rail').length, 1);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Guest closet continuous short-hang rail').length, 2);
  assert.equal(wardrobe.children.filter((part) => part.name === 'Walk-in folded-clothes shelf').length, 5);
  const hangingShelves = wardrobe.children.filter((part) => part.name === 'Guest closet hanging-zone upper shelf');
  assert.equal(hangingShelves.length, 2);
  assert.ok(Math.abs((hangingShelves[1].z - hangingShelves[1].d / 2 - hangingShelves[0].z - hangingShelves[0].d / 2) * 12 - 36.6) < 1e-9, 'Actual shelf edges preserve the internal 36.6-inch cross aisle without widening into the hall');
  const folded = wardrobe.children.filter((part) => part.name === 'Walk-in folded-clothes shelf');
  assert.ok(folded.every((shelf) => shelf.w * 12 === 12 && shelf.x - shelf.w / 2 >= 19.175 && shelf.x + shelf.w / 2 < 21.175), 'Shallow side shelves stay behind the restored hall wall');
  assert.deepEqual(find('Guest bathroom tile'), { name: 'Guest bathroom tile', ...suite.bathroom });
  assert.equal(find('Guest bathroom vanity').x, suite.vanity.x);
  assert.equal(find('Guest bathroom vanity').z, suite.vanity.z);
  assert.equal(find('Guest bathroom vanity').width, suite.vanity.width);
  assert.equal(find('Guest bathroom vanity').rotation, suite.vanity.rotation);
  assert.equal(find('Guest bathroom toilet').x, suite.toilet.x);
  assert.equal(find('Guest bathroom toilet').z, suite.toilet.z);
  const shower = find('Guest bathroom shower');
  const pan = shower.children.find((part) => part.name === 'Guest shower pan');
  assert.equal(shower.x, suite.shower.x);
  assert.equal(shower.z, suite.shower.z);
  assert.equal(pan.w, suite.shower.w);
  assert.equal(pan.d, suite.shower.d);
  for (const name of ['Guest shower drain', 'Guest shower rain head', 'Guest shower mixer control', 'Guest shower fixed south glass', 'Guest shower fixed east glass']) {
    assert.ok(shower.children.some((part) => part.name === name), name);
  }
  const glassDoor = shower.children.find((part) => part.name === 'Guest shower inward-opening glass door');
  assert.equal(glassDoor.rotation.y, Math.PI / 2);
  assert.equal(glassDoor.userData.nominalWidthInches, 30);
  assert.equal(find('Guest walk-in closet inward-opening door'), undefined);
  for (const [name, opening, sign] of [['Guest bathroom', suite.bathroomDoor, 1]]) {
    const door = find(`${name} inward-opening door`);
    assert.equal(door.rotation.y, sign * Math.PI / 2);
    assert.equal(door.z, 41.675);
    assert.equal(door.userData.inwardSwing, true);
    const nearestShowerZ = door.z - opening.width;
    assert.ok(nearestShowerZ - (suite.shower.z + suite.shower.d) >= 0.19, 'Entire inward leaf sweep stays south of the shower');
    assert.ok(opening.x - 0.22 > suite.vanity.x + 1, 'Hinge/knob stays east of the relocated vanity');
    assert.equal(door.userData.nominalWidthInches, opening.width * 12);
    assert.equal(door.children.filter((part) => part.name === `${name} painted-white door leaf`).length, 1);
  }
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
  assert.ok(entry.powderDoor.x - entry.powderDoor.width - (entry.vanity.x + entry.vanity.width / 2 + 0.03) > 0.15, 'Open powder door clears the vanity top by more than 1.8 inches');
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
    THREE: { Group }, scene, livingCenterZ: getLivingRoomFeatureLayout().centerZ, fireplaceFaceX: 1.38,
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
    assert.equal(cabinet.userData.widthInches, 24);
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
    assert.ok(cabinet.position.z + cabinet.userData.widthInches / 24 < baseline.stairs.z, 'Cabinet stays outside the stair opening');
    assert.ok(cabinet.position.z - cabinet.userData.widthInches / 24 > getLivingRoomFeatureLayout().wallStartZ, 'Cabinet stays inside the living wall');
    assert.equal(cabinet.userData.openBack, true);
    assert.equal(cabinet.userData.openFront, false);
    assert.equal(cabinet.userData.clearanceVerified, false);
    const doors = cabinet.children.filter((child) => child.name === 'Closed media cabinet Shaker door');
    assert.equal(doors.length, 2, 'Both cabinet doors are closed');
    for (const door of doors) {
      assert.ok(Math.abs(door.width - (24 / 24 - 0.04)) < 1e-9, 'Door widths follow the narrower cabinet');
      assert.ok(Math.abs(cabinet.position.x + door.z + 0.04 - context.fireplaceFaceX) < 1e-9, 'Outermost door rail is flush with stone');
      assert.match(door.userData.hardware, /Concealed push latch/);
    }
    for (const part of cabinet.children.filter((child) => !(child instanceof Group))) {
      assert.ok(cabinet.position.x + part.z + part.depth / 2 <= context.fireplaceFaceX + 1e-9, `${part.name} does not project beyond the fireplace`);
      assert.ok(part.y + part.height / 2 <= 26 / 12 + 1e-9, 'No devices or chargers displayed on top');
    }
    assert.ok(cabinet.children.some((child) => child.name === 'Concealed equipment and charging shelf'));
    const top = cabinet.children.find((child) => child.name === 'Clear oak cabinet top flush with fireplace');
    assert.equal(top.width * 12, 24, 'Actual cabinet geometry is 24 inches wide');
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
  const apply = source.slice(source.indexOf('  function applyLivingLayout('), source.indexOf('  function livingPlan('));
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
  const cabinetEndZ = midpoint + 3.06 + 24 / 12;
  assert.ok(readingChair[1] - halfDepth > cabinetEndZ, 'Reading-chair envelope clears the narrowed cabinet');
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
    UpstairsLayout: layout, getLivingRoomFeatureLayout, getGuestEntryLayout, getGuestSuiteLayout, ceilingHeight: 9, garageFloorY: -1.25, casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12,
    garageEntry: { x: 39.5, width: 3, height: 8 },
    garageFloorAreas: [{ x: 45.4, z: 15, w: 10.1, d: 11.9 }, { x: 29, z: 26.9, w: 26.5, d: 7.7 }, { x: 31.2, z: 34.6, w: 24.3, d: 14.4 }],
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
