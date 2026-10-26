'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}

function setup() {
  const context = {
    THREE: { BufferGeometry: class {} }, cabinetFinish: {}, cabinetRailFinish: {},
    box(parent, x, y, z, width, height, depth, material) {
      const mesh = new Group();
      mesh.position.set(x, y, z);
      mesh.geometry = { parameters: { width, height, depth }, dispose() {} };
      mesh.material = material;
      parent.add(mesh);
      return mesh;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function toggleCabinet('), source.indexOf('  function shakerFront(')), context);
  return context;
}

function front(parent, data = {}) {
  const item = new Group();
  item.userData = { cabinetFront: true, width: 2, height: 2, ...data };
  parent.add(item);
  return item;
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);

test('cabinet doors swing outward around a fixed edge and restore exactly at all orientations', () => {
  for (const rotation of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) for (const hingeSide of [-1, 1]) {
    const context = setup();
    const root = new Group();
    const door = front(root, { hingeSide });
    door.position.set(5, 2, 9);
    door.rotation.y = rotation;
    context.prepareCabinetInteractions(root);
    const closedHinge = { x: 5 + hingeSide * Math.cos(rotation), z: 9 - hingeSide * Math.sin(rotation) };
    context.toggleCabinet(door);
    close(door.position.x + hingeSide * Math.cos(door.rotation.y), closedHinge.x);
    close(door.position.z - hingeSide * Math.sin(door.rotation.y), closedHinge.z);
    close((door.position.x - 5) * Math.sin(rotation) + (door.position.z - 9) * Math.cos(rotation), 1);
    context.toggleCabinet(door);
    close(door.position.x, 5);
    close(door.position.y, 2);
    close(door.position.z, 9);
    close(door.rotation.y, rotation);
    assert.equal(door.userData.interactiveCabinet.open, false);
  }
});

test('drawers slide along their local outward normal with a box that moves with the front', () => {
  const context = setup();
  const root = new Group();
  const drawer = front(root, { drawerTravelFeet: 1.5, height: 0.74 });
  drawer.rotation.y = -Math.PI / 2;
  context.prepareCabinetInteractions(root);
  assert.equal(drawer.children.filter((part) => part.name === 'Pull-out drawer side').length, 2);
  const floor = drawer.children.find((part) => part.name === 'Pull-out drawer floor');
  assert.ok(0.65 + floor.position.y - floor.geometry.parameters.height / 2 > 0.4225, 'The lowest kitchen drawer box clears the island cabinet floor');
  context.toggleCabinet(drawer);
  close(drawer.position.x, -1.5);
  close(drawer.position.z, 0);
  context.toggleCabinet(drawer);
  close(drawer.position.x, 0);
});

test('existing vanity drawer boxes move as a unit and existing tray/closet operations are not doubled', () => {
  const context = setup();
  const root = new Group();
  const drawer = new Group();
  drawer.userData.travelFeet = 1.25;
  root.add(drawer);
  const handleFront = front(drawer);
  const tray = new Group();
  tray.userData.interactiveHouseDoor = { operation: 'sliding' };
  root.add(tray);
  const trayFront = front(tray);
  context.prepareCabinetInteractions(root);
  assert.equal(trayFront.userData.interactiveCabinet, undefined);
  context.toggleCabinet(handleFront);
  close(drawer.position.z, 1.25);
  close(handleFront.position.z, 0);
  context.toggleCabinet(handleFront);
  close(drawer.position.z, 0);
});

test('a tall waste pull-out carries its floor near the toe-kick instead of halfway up the bins', () => {
  const context = setup();
  const root = new Group();
  const waste = front(root, { width: 1.45, height: 2.65, drawerTravelFeet: 1.75, drawerFloorY: -0.95 });
  waste.position.y = 1.45;
  context.prepareCabinetInteractions(root);
  const floor = waste.children.find((part) => part.name === 'Pull-out drawer floor');
  const side = waste.children.find((part) => part.name === 'Pull-out drawer side');
  close(waste.position.y + floor.position.y + floor.geometry.parameters.height / 2, 0.52);
  close(side.position.y - side.geometry.parameters.height / 2, floor.position.y);
  context.toggleCabinet(waste);
  close(waste.position.z, 1.75);
  context.toggleCabinet(waste);
  close(waste.position.z, 0);
});

test('solid cabinet placeholders become five-panel hollow carcasses with their correct front open', () => {
  for (const axis of ['z+', 'z-', 'x+', 'x-']) {
    const context = setup();
    const root = new Group();
    const body = context.box(root, 3, 2, 4, 2, 3, 2, {});
    body.userData.cabinetBody = axis;
    context.prepareCabinetInteractions(root);
    assert.equal(body.children.length, 5);
    assert.equal(body.userData.cabinetBody, undefined);
    const dimension = axis[0];
    const sign = axis.endsWith('+') ? 1 : -1;
    assert.ok(!body.children.some((part) => part.position[dimension] * sign > 0.9 && part.geometry.parameters.height > 1));
  }
});

test('pointer taps toggle a cabinet without starting a tour, while drags do not open it', () => {
  const context = setup();
  const root = new Group();
  const door = front(root);
  context.prepareCabinetInteractions(root);
  const listeners = {};
  let tourPicks = 0;
  Object.assign(context, {
    renderer: { domElement: { addEventListener(type, callback) { listeners[type] = callback; } } },
    activeFloor: 'ground', navigationMode: 'rotate', walkDrag: null,
    pickPatioDoor: () => false,
    pickHouseDoor() { context.toggleCabinet(door); return true; },
    pickVehicleDoor: () => false, pickTourFloor() { tourPicks++; }
  });
  vm.runInNewContext(source.slice(source.indexOf("  renderer.domElement.addEventListener('pointerdown'"), source.indexOf("  for (const eventName of ['pointerup'")), context);
  const event = { pointerId: 1, clientX: 100, clientY: 100, button: 0, isPrimary: true };
  listeners.pointerdown(event);
  listeners.pointerup(event);
  assert.equal(door.userData.interactiveCabinet.open, true);
  assert.equal(tourPicks, 0);
  listeners.pointerdown(event);
  listeners.pointerup(event);
  assert.equal(door.userData.interactiveCabinet.open, false);
  listeners.pointerdown(event);
  listeners.pointermove({ ...event, clientX: 120 });
  listeners.pointerup({ ...event, clientX: 120 });
  assert.equal(door.userData.interactiveCabinet.open, false);
});
