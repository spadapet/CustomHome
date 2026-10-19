'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGroundFloorDefaultPlan, getLivingRoomFeatureLayout, getGuestEntryLayout } = require('../floor-plan-ground.js');
const baseline = getGroundFloorDefaultPlan();

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

test('fireplace and sofa stay centered while the reading chair sits near the stair corner', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const context = { getLivingRoomFeatureLayout };
  const feature = getLivingRoomFeatureLayout();
  const windowData = source.slice(source.indexOf('  const livingFeatureWall ='), source.indexOf('  const livingSideWindows ='));
  const layoutData = source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX ='));
  vm.runInNewContext(`${windowData}\n${layoutData}\nglobalThis.windows = livingWindowCenters; globalThis.layouts = livingLayouts;`, context);
  const midpoint = (context.windows[0] + context.windows[1]) / 2;
  const layout = context.layouts[0];
  assert.equal(layout.id, 'centered');
  assert.equal(layout.recommended, true);
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
  assert.equal(context.layouts.length, 5);
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
    UpstairsLayout: layout, getLivingRoomFeatureLayout, getGuestEntryLayout, ceilingHeight: 9, garageFloorY: -1.25, casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12,
    garageEntry: { x: 40, width: 3 },
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
