'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const exteriorSource = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

test('the shared kitchen wall and refrigeration bank move six inches without widening the oven tower', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; this.position = {}; }
    add(child) { this.children.push(child); }
  }
  const boxes = [];
  const context = {
    THREE: { Group }, kitchen: new Group(), ceilingHeight: 9, cabinetRailFinish: {},
    box(parent, x, y, z, w, h, d, material) {
      const part = { x, y, z, w, h, d, material };
      boxes.push(part); parent.add(part); return part;
    }
  };
  const start = source.indexOf('  const bottomRun =');
  const end = source.indexOf('  const steamOvenBottom =', start);
  const cornice = source.match(/  box\(bottomRun, bottomRunCenterX,[^\n]+Continuous refrigeration cabinet cornice';/);
  assert.ok(start >= 0 && end > start && cornice);
  vm.runInNewContext(`${source.slice(start, end)}\n${cornice[0]}\nglobalThis.layout = { fridgeLeft, freezerRight, pantryWidth, pantryCenterX, columnWidth };`, context);
  assert.equal(boxes.length, 1);
  assert.ok(Math.abs(boxes[0].x - boxes[0].w / 2 - 29.1875) < 1e-9);
  assert.ok(Math.abs(boxes[0].x + boxes[0].w / 2 - 37.3) < 1e-9);
  assert.equal(context.layout.fridgeLeft, 29.25);
  assert.equal(context.layout.freezerRight, 37);
  assert.equal(context.layout.pantryWidth, 2.625, 'Do not widen the oven/storage tower');
  assert.equal(context.layout.columnWidth, 2.5, 'Both appliance bays remain 30 inches');
  const fridgeCenter = context.layout.fridgeLeft + context.layout.columnWidth / 2;
  const freezerCenter = context.layout.freezerRight - context.layout.columnWidth / 2;
  assert.equal(fridgeCenter, 30.5);
  assert.equal(freezerCenter, 35.75);
  assert.equal(context.layout.pantryCenterX, (fridgeCenter + freezerCenter) / 2);
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const movedWall = plan.walls.find(([name]) => name === 'Kids east return');
  assert.equal(movedWall[1], 29, 'Restore the gray kids-room return');
  assert.equal(movedWall[3], 29);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen east')[1], 37.5);
  const endGapInches = (boxes[0].x - boxes[0].w / 2 - (movedWall[1] + 0.175)) * 12;
  assert.ok(endGapInches > 0 && endGapInches <= 0.25, 'Six-inch gap closes to a small modeled scribe gap, not another storage unit');
  assert.match(source, /\[29, kidsRoom\.z, 29, 26\.9, true, \[\], ceilingHeight, \[1\]\]/, 'Do not move the gray wall or bury trim inside the shifted bank');
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 29, 'Do not move the garage wall');
  assert.doesNotMatch(source, /Stair-side narrow pull-out cabinet|Narrow pull-out carcass|Narrow end overhead cabinet|endStorageFront|endUpperFront/);
  assert.match(source, /appliance.position.set\(x, 0, 25.725\)/);
});

test('sink/window bank stays centered and actual side counters fit the relocated cooking wall', () => {
  const context = { casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12, getKitchenPassageLayout: require('../floor-plan-ground.js').getKitchenPassageLayout, getPrepWindowLayout: require('../floor-plan-ground.js').getPrepWindowLayout, getPrepWindowBankLayout: require('../floor-plan-ground.js').getPrepWindowBankLayout };
  const start = source.indexOf('  const kitchenWallLeft =');
  context.getKitchenWindowBankLayout = require('../floor-plan-ground.js').getKitchenWindowBankLayout;
  const end = source.indexOf('  const kidsRoomNorthZ =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.geometry = { kitchenWallLeft, kitchenWallRight, kitchenSinkX, kitchenSinkWindows, kitchenWindowTrimExtension, kitchenEndSconceCenters };`, context);
  const geometry = context.geometry;
  assert.equal(geometry.kitchenWallRight, 37.5);
  assert.equal(geometry.kitchenSinkX, 32);
  assert.deepEqual(Array.from(geometry.kitchenSinkWindows, (window) => window.width), [1.5, 4.5, 1.5]);
  assert.deepEqual(Array.from(geometry.kitchenSinkWindows, (window) => window.x), [29, 32, 35]);
  const [left, center, right] = geometry.kitchenSinkWindows;
  assert.ok(Math.abs(left.x + left.width / 2 - (center.x - center.width / 2)) < 1e-9, 'Joined frames have no wall pier or duplicate casing between them');
  assert.ok(geometry.kitchenEndSconceCenters[0] > geometry.kitchenWallLeft + 0.175);
  assert.ok(geometry.kitchenEndSconceCenters[1] < geometry.kitchenWallRight - 0.175);
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

test('shared-wall floor changes leave the gray wall, garage and all opening widths fixed', () => {
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const kids = plan.rooms.find((room) => room.name === 'Kids room');
  assert.equal(kids.w, 10);
  assert.equal(plan.floors.filter((floor) => floor.room === 'Kids room').length, 1, 'Remove the incorrectly added corner pocket');
  const north = plan.walls.find(([name]) => name === 'Kids north');
  assert.equal(north[3], 29);
  const shared = plan.walls.find(([name]) => name === 'Kitchen east');
  assert.deepEqual(shared.slice(1, 5), [37.5, 7, 37.5, 25.3]);
  assert.deepEqual(shared[5], [[2.725, 5.725, 0, 8], [14.175, 17.175, 0, 8]]);
  assert.equal(plan.rooms.find((room) => room.name === 'Kitchen').w, 11);
  assert.equal(plan.rooms.find((room) => room.name === 'Prep kitchen').w, 18);
  assert.equal(plan.rooms.find((room) => room.name === 'Mudroom').w, 7.4 - 2 / 12);
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 29);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom south')[2], 26.9);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
});

test('house-door picker toggles hinged, bifold and sliding leaves to their modeled limits', () => {
  const start = source.indexOf('  function pickHouseDoor(event) {');
  const end = source.indexOf('  const charger = furnishing(', start);
  assert.ok(start >= 0 && end > start);
  const door = { userData: { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 115, openRotationSign: -1 } }, rotation: {}, visible: true };
  const panel = { parent: door, visible: true, userData: {} };
  const context = {
    activeFloor: 'ground',
    groundLayoutPreview: false,
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 80 }) } },
    camera: { updateMatrixWorld() {} },
    scene: { children: [], updateMatrixWorld() {} },
    intersections: [{ object: panel }],
    renderCount: 0,
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
  context.activeFloor = 'basement';
  assert.equal(context.pickHouseDoor({ clientX: 60, clientY: 40 }), false);
});

test('modeled room doors and exterior overhead leaves carry click-operation metadata', () => {
  assert.match(source, /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 115/);
  assert.match(source, /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90/);
  assert.match(source, /bathroomPocketDoor\.userData\.interactiveHouseDoor = \{ operation: 'sliding', open: false, closedCenterX:/);
  assert.match(source, /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 90, maxAngleDegrees: 180/);
  assert.match(exteriorSource, /interactiveHouseDoor: \{ operation: 'overhead', open: false, maxAngleDegrees: 90/);
  assert.match(exteriorSource, /buildArchedFrontEntry\(THREE,/);
  assert.match(fs.readFileSync(require.resolve('../floor-plan-ground.js'), 'utf8'), /interactiveHouseDoor: \{ operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 110/);
});
