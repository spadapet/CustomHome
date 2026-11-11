'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
const exteriorSource = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);

test('36-inch Designer bays and separate fillers fit the approved short-wall revision without widening the oven tower', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; this.position = {}; }
    add(child) { this.children.push(child); }
  }
  const boxes = [];
  const context = {
    THREE: { Group }, kitchen: new Group(), ceilingHeight: 9, cabinetRailFinish: {},
    kitchenRefrigeration: require('../assets/js/floor-plan-ground.js').getKitchenRefrigerationLayout(),
    box(parent, x, y, z, w, h, d, material) {
      const part = { x, y, z, w, h, d, material };
      boxes.push(part); parent.add(part); return part;
    }
  };
  const start = source.indexOf('  const bottomRun =');
  const end = source.indexOf('  const steamOvenBottom =', start);
  const cornice = source.match(/  box\(bottomRun, bottomRunCenterX,[^\n]+Continuous refrigeration cabinet cornice';/);
  assert.ok(start >= 0 && end > start && cornice);
  vm.runInNewContext(`${source.slice(start, end)}\nconst refrigerationCorniceTop = upperStorageTop + 0.15;\n${cornice[0]}\nglobalThis.layout = { fridgeLeft, freezerRight, pantryWidth, pantryCenterX, columnWidth };`, context);
  assert.equal(boxes.length, 1);
  assert.ok(Math.abs(boxes[0].x - boxes[0].w / 2 - 27.9375) < 1e-9);
  assert.ok(Math.abs(boxes[0].x + boxes[0].w / 2 - 37.3) < 1e-9);
  assert.ok(Math.abs(boxes[0].w * 12 - 112.35) < 1e-9, '72 inches of appliances + 31.5 tower + 3 framing + 5.85 fillers');
  assert.equal(context.layout.fridgeLeft, 28.25);
  assert.equal(context.layout.freezerRight, 37);
  assert.equal(context.layout.pantryWidth, 2.625, 'Do not widen the oven/storage tower');
  assert.equal(context.layout.columnWidth, 3, 'Both appliance bays are 36 inches');
  const fridgeCenter = context.layout.fridgeLeft + context.layout.columnWidth / 2;
  const freezerCenter = context.layout.freezerRight - context.layout.columnWidth / 2;
  assert.equal(fridgeCenter, 29.75);
  assert.equal(freezerCenter, 35.5);
  assert.equal(context.layout.pantryCenterX, (fridgeCenter + freezerCenter) / 2);
  const plan = require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan();
  const movedWall = ['Refrigeration end', 27.75, 26.9, 27.75, 26.9];
  assert.equal(movedWall[1], 27.75, 'Owner approved 15-inch west shift: 12 inches for appliances + 3 inches for filler');
  assert.equal(movedWall[3], 27.75);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen east')[1], 37.5);
  const endGapInches = (boxes[0].x - boxes[0].w / 2 - (movedWall[1] + 0.175)) * 12;
  assert.ok(endGapInches > 0 && endGapInches <= 0.25, 'Retain a small scribe gap outside the separate filler');
  assert.ok(Math.abs((context.layout.fridgeLeft - movedWall[1] - 0.175) * 12 - 3.9) < 1e-9);
  assert.doesNotMatch(source, /\[kitchenRefrigeration\.returnX, kidsRoom\.z, kitchenRefrigeration\.returnX, 26\.9/, 'Obsolete jog is removed from furnished walls');
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 31.2, 'Garage partition aligns with the bathroom, independently of the kitchen return');
  assert.doesNotMatch(source, /Stair-side narrow pull-out cabinet|Narrow pull-out carcass|Narrow end overhead cabinet|endStorageFront|endUpperFront/);
  assert.match(source, /appliance\.position\.set\(x, 0, 25\.725 \+ refrigerationWallSetback\)/);
  assert.match(source, /wallSetbackInches: refrigerationWallSetback \* 12/);
});

test('sink/window bank stays centered and actual side counters fit the relocated cooking wall', () => {
  const context = { casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12, getKitchenPassageLayout: require('../assets/js/floor-plan-ground.js').getKitchenPassageLayout, getPrepWindowLayout: require('../assets/js/floor-plan-ground.js').getPrepWindowLayout, getPrepWindowBankLayout: require('../assets/js/floor-plan-ground.js').getPrepWindowBankLayout };
  const start = source.indexOf('  const kitchenWallLeft =');
  context.getGroundFrontLayout = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout;
  context.getKitchenWindowBankLayout = require('../assets/js/floor-plan-ground.js').getKitchenWindowBankLayout;
  context.getGuestSuiteLayout = require('../assets/js/floor-plan-ground.js').getGuestSuiteLayout;
  context.getKitchenRefrigerationLayout = require('../assets/js/floor-plan-ground.js').getKitchenRefrigerationLayout;
  const end = source.indexOf('  const kidsRoomNorthZ =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.geometry = { kitchenWallLeft, kitchenWallRight, kitchenSinkX, kitchenSinkWindows };`, context);
  const geometry = context.geometry;
  assert.equal(geometry.kitchenWallRight, 37.5);
  assert.equal(geometry.kitchenSinkX, 32);
  assert.deepEqual(Array.from(geometry.kitchenSinkWindows, (window) => window.width), [1.5, 4.5, 1.5]);
  assert.deepEqual(Array.from(geometry.kitchenSinkWindows, (window) => window.x), [29, 32, 35]);
  const [left, center, right] = geometry.kitchenSinkWindows;
  assert.ok(Math.abs(left.x + left.width / 2 - (center.x - center.width / 2)) < 1e-9, 'Joined frames have no wall pier or duplicate casing between them');
  assert.ok(left.x - left.width / 2 > geometry.kitchenWallLeft + 0.175);
  assert.ok(right.x + right.width / 2 < geometry.kitchenWallRight - 0.175);
  assert.ok(Math.abs((left.x + right.x) / 2 - geometry.kitchenSinkX) < 1e-9);
  const boxes = [];
  const cabinets = {
    kitchenSinkX: geometry.kitchenSinkX, kitchenSinkRunZ: 8.2, kitchen: {}, cabinetFinish: {}, countertop: {},
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; boxes.push(part); return part; }
  };
  const counterStart = source.indexOf('  box(kitchen, kitchenSinkX - 3.4,');
  const counterEnd = source.indexOf('  drawerFront(kitchenSinkX - 4.125,', counterStart);
  assert.ok(counterStart >= 0 && counterEnd > counterStart);
  vm.runInNewContext(source.slice(counterStart, counterEnd), cabinets);
  const counters = boxes.filter((part) => part.name === 'Top kitchen quartz counter');
  assert.equal(counters.length, 2);
  assert.ok(counters.every((part) => Math.abs(part.w * 12 - 45.6) < 1e-9));
  assert.ok(Math.abs(counters[0].x - counters[0].w / 2 - 26.7) < 1e-9);
  assert.ok(Math.abs(counters[1].x + counters[1].w / 2 - 37.3) < 1e-9);
});

test('kids-room expansion preserves kitchen return and all opening widths', () => {
  const plan = require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan();
  const kids = plan.rooms.find((room) => room.name === 'Kids room');
  assert.equal(kids.w, 12.2);
  const kidsFloors = plan.floors.filter((floor) => floor.room === 'Kids room');
  const kidsNorthZ = plan.walls.find(([name]) => name === 'Kids north')[2];
  assert.deepEqual(kidsFloors.map(({ x, z, w, d, elevation }) => [x, z, w, d, elevation]), [
    [19, kidsNorthZ, 8.75, 37.2 - kidsNorthZ, 0],
    [27.75, 26.9, 31.2 - 27.75, 37.2 - kidsNorthZ - (26.9 - kidsNorthZ), 0]
  ], 'Both kids floor strips stop at the full-width bathroom; only the short northeast corner transfers to kitchen');
  for (const floor of kidsFloors) {
    assert.ok(floor.x + floor.w <= 27.75 || floor.z >= 26.9, 'No kids flooring may enter the widened refrigeration run');
  }
  for (let i = 0; i < kidsFloors.length; i++) {
    for (const other of kidsFloors.slice(i + 1)) {
      const floor = kidsFloors[i];
      assert.ok(Math.min(floor.x + floor.w, other.x + other.w) <= Math.max(floor.x, other.x)
        || Math.min(floor.z + floor.d, other.z + other.d) <= Math.max(floor.z, other.z),
      'Shared kids-room floor rectangles must not overlap');
    }
  }
  const north = plan.walls.find(([name]) => name === 'Kids north');
  assert.equal(north[3], 27.75);
  const shared = plan.walls.find(([name]) => name === 'Kitchen east');
  assert.deepEqual(shared.slice(1, 5), [37.5, 7, 37.5, 25.3]);
  [[2.6375, 5.1375], [14.7625, 17.2625]].forEach(([start, end], index) => {
    close(shared[5][index][0], start);
    close(shared[5][index][1], end);
    assert.deepEqual(shared[5][index].slice(2), [0, 8]);
  });
  assert.equal(plan.rooms.find((room) => room.name === 'Kitchen').w, 11);
  assert.equal(plan.rooms.find((room) => room.name === 'Prep kitchen').w, 18);
  assert.equal(plan.rooms.find((room) => room.name === 'Mudroom').w, 7.4 - 8 / 12);
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 31.2);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom south')[2], 26.9);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
});

test('house-door picker toggles hinged, bifold and sliding leaves to their modeled limits', () => {
  const start = source.indexOf('  function pickHouseDoor(event) {');
  const end = source.indexOf('  const charger = furnishing(', start);
  assert.ok(start >= 0 && end > start);
  const door = { userData: { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 115, openRotationSign: -1 } }, rotation: {}, visible: true };
  const panel = { parent: door, visible: true, userData: {} };
  let now = 0;
  let nextFrameId = 0;
  const frames = [];
  const context = {
    activeFloor: 'ground',
    groundLayoutPreview: false,
    requestAnimationFrame(callback) { const frame = { id: ++nextFrameId, callback }; frames.push(frame); return frame.id; },
    cancelAnimationFrame(id) { const index = frames.findIndex(frame => frame.id === id); if (index >= 0) frames.splice(index, 1); },
    performance: { now: () => now },
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 80 }) } },
    camera: { updateMatrixWorld() {} },
    scene: { children: [], updateMatrixWorld() {} },
    intersections: [{ object: panel }],
    visiblePickTargets() { return []; },
    renderCount: 0,
    collisionRefreshCount: 0,
    buildWalkObstacles() { context.collisionRefreshCount++; },
    THREE: {
      Vector2: class { constructor(x, y) { this.x = x; this.y = y; } },
      Raycaster: class { setFromCamera() {} intersectObjects() { return context.intersections; } },
      MathUtils: { degToRad: (degrees) => degrees * Math.PI / 180 }
    },
    render() { context.renderCount++; }
  };
  vm.runInNewContext(source.slice(start, end), context);
  context.intersections.unshift({ object: { visible: true, userData: {} } });
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), false, 'An intervening object blocks clicks through to the appliance');
  assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees, 0);
  context.intersections.shift();
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees, 115);
  assert.equal(door.rotation.y, -115 * Math.PI / 180);
  assert.equal(context.renderCount, 1);
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees, 0);
  assert.equal(door.rotation.y, 0);

  door.userData.interactiveHouseDoor.openRotationSign = 1;
  context.pickHouseDoor({ clientX: 60, clientY: 40 });
  assert.equal(door.rotation.y, 115 * Math.PI / 180, 'The opposite-hand refrigerator opens from its opposite hinge');

  const slider = { userData: { interactiveHouseDoor: { operation: 'sliding', open: false, closedCenterX: 2, openCenterX: 5 } }, position: { x: 2 }, visible: true };
  context.intersections = [{ object: { parent: slider, visible: true } }];
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(slider.position.x, 5);
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(slider.position.x, 2);

  slider.userData.interactiveHouseDoor = { operation: 'sliding', axis: 'z', open: false, closedCenterX: 0, openCenterX: 1.75 };
  slider.position.z = 0;
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(slider.position.z, 1.75);
  assert.equal(slider.position.x, 2, 'Tray extension does not change the cabinet x position');
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(slider.position.z, 0);

  const foldPanel = { rotation: { y: 0 } };
  const bifold = { userData: { interactiveHouseDoor: { operation: 'bifold', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: -1, foldPanel } }, rotation: { y: 0 }, visible: true };
  context.intersections = [{ object: { parent: bifold, visible: true } }];
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(bifold.rotation.y, -Math.PI / 2);
  assert.equal(foldPanel.rotation.y, -Math.PI / 2);
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(bifold.rotation.y, 0);
  assert.equal(foldPanel.rotation.y, 0);

  const overhead = { userData: { interactiveHouseDoor: { operation: 'overhead', open: false, maxAngleDegrees: 90 } }, rotation: { x: 0 }, visible: true };
  context.intersections = [{ object: { parent: overhead, visible: true } }];
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(overhead.rotation.x, Math.PI / 2);
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(overhead.rotation.x, 0);
  context.activeFloor = 'upstairs';
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
  assert.equal(context.collisionRefreshCount, 1, 'Only the upstairs operation refreshes its tour collision cache');
  const advance = (time) => { now = time; const frame = frames.shift(); assert.ok(frame, `animation frame at ${time} ms`); frame.callback(time); };
  context.activeFloor = 'ground';
  for (const [label, sign] of [['Freezer', -1], ['Refrigerator', 1]]) {
    const applianceDoor = { userData: { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: sign, animateOpenClose: true, animationDurationMs: 300 } }, rotation: { y: 0 }, visible: true };
    context.intersections = [{ object: { parent: applianceDoor, visible: true } }];
    const startTime = now;
    assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
    assert.equal(applianceDoor.userData.interactiveHouseDoor.openAngleDegrees, 90);
    assert.equal(applianceDoor.rotation.y, 0, `${label} starts moving on the next animation frame`);
    advance(startTime);
    advance(startTime + 150);
    assert.ok(Math.abs(applianceDoor.rotation.y - sign * Math.PI / 4) < 1e-9, `${label} eases smoothly through its midpoint`);
    advance(startTime + 300);
    assert.ok(Math.abs(applianceDoor.rotation.y - sign * Math.PI / 2) < 1e-9, `${label} reaches its 90-degree stop`);
    assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), true);
    advance(startTime + 300);
    advance(startTime + 450);
    assert.ok(Math.abs(applianceDoor.rotation.y - sign * Math.PI / 4) < 1e-9, `${label} eases back through its midpoint`);
    advance(startTime + 600);
    assert.equal(applianceDoor.rotation.y, 0, `${label} closes to its default pose`);
  }

  context.activeFloor = 'basement';
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), false);
});

test('modeled room doors, cabinet pullouts and exterior overhead leaves carry click-operation metadata', () => {
  assert.match(source, /doorStopDegrees: 90, doorClearanceAt105Inches: 34\.5, hingeSideClearanceAt105Inches: 7\.25, factoryMaxAngleDegrees: 105/);
  assert.match(source, /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90/);
  assert.match(source, /interactiveHouseDoor: \{ operation: 'sliding', axis: 'z', open: false, closedCenterX: 0, openCenterX: 1\.75 \}/);
  assert.match(source, /powderLeaf\.userData = \{ interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 90, maxAngleDegrees: 90, openRotationSign: 1 \}/);
  assert.match(exteriorSource, /interactiveHouseDoor: \{ operation: 'overhead', open: false, maxAngleDegrees: 90/);
  assert.match(exteriorSource, /buildArchedFrontEntry\(THREE,/);
  assert.match(fs.readFileSync(require.resolve('../assets/js/floor-plan-ground.js'), 'utf8'), /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 110/);
});
