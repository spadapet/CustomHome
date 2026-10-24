'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function controls() {
  const button = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(name, callback) { this[name] = callback; } };
  const status = {};
  const leaf = { visible: true, userData: { openAngleDegrees: 0, maxAngleDegrees: 180 }, rotation: { y: 0 } };
  const context = {
    activeFloor: 'ground', groundLayoutPreview: false, doorLeaf: leaf,
    document: { getElementById(id) { return id === 'patio-door-toggle' ? button : status; } },
    THREE: {
      MathUtils: { degToRad: (angle) => angle * Math.PI / 180 },
      Vector2: class {},
      Raycaster: class { setFromCamera() {} intersectObjects() { return context.hits; } }
    },
    renderer: { domElement: { getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } } },
    scene: { children: [], updateMatrixWorld() {} }, camera: { updateMatrixWorld() {} },
    renders: 0, rebuilds: 0, stops: 0, hits: [],
    render() { context.renders++; },
    buildWalkObstacles() { context.rebuilds++; },
    stopTourTravel() { context.stops++; }
  };
  const start = source.indexOf('  const patioDoorButton =');
  const end = source.indexOf('  const vehicleDoorControls =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  return { context, button, status, leaf };
}

test('patio control toggles inward around the existing hinge and keeps accessible state in sync', () => {
  const { context, button, status, leaf } = controls();
  button.click();
  assert.equal(leaf.userData.openAngleDegrees, 180);
  assert.equal(leaf.rotation.y, Math.PI);
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(button.textContent, 'Close patio door');
  assert.match(status.textContent, /open 180 degrees inward/);
  button.click();
  assert.equal(leaf.rotation.y, 0);
  assert.equal(leaf.userData.openAngleDegrees, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(button.textContent, 'Open patio door');
  assert.match(status.textContent, /closed/);
  assert.equal(context.renders, 2);
  assert.equal(context.rebuilds, 2);
  assert.equal(context.stops, 2, 'Invalidate any tour route based on the old pose');
});

test('direct picking accepts leaf glazing or hardware but not frames, windows, walls or hidden ancestors', () => {
  const { context, leaf } = controls();
  const panel = { visible: true, parent: leaf };
  const handle = { visible: true, parent: { visible: true, parent: leaf } };
  const wall = { visible: true };
  const event = { clientX: 50, clientY: 50 };
  context.hits = [{ object: panel }];
  assert.equal(context.pickPatioDoor(event), true);
  assert.equal(leaf.rotation.y, Math.PI);
  context.hits = [{ object: handle }];
  assert.equal(context.pickPatioDoor(event), true);
  assert.equal(leaf.rotation.y, 0);
  context.hits = [{ object: wall }, { object: panel }];
  assert.equal(context.pickPatioDoor(event), false);
  wall.visible = false;
  assert.equal(context.pickPatioDoor(event), true);
  leaf.parent = { visible: false };
  assert.equal(context.pickPatioDoor(event), false);
  context.hits = [];
  assert.equal(context.pickPatioDoor(event), false);
  assert.equal(context.renders, 3);
});

test('upstairs, exterior and layout previews cannot operate the ground-floor patio door', () => {
  const { context, button, leaf } = controls();
  context.hits = [{ object: { visible: true, parent: leaf } }];
  for (const floor of ['upstairs', 'exterior']) {
    context.activeFloor = floor;
    assert.equal(context.pickPatioDoor({}), false);
    button.click();
    assert.equal(leaf.rotation.y, 0);
  }
  context.activeFloor = 'ground';
  context.groundLayoutPreview = true;
  assert.equal(context.pickPatioDoor({}), false);
  button.click();
  assert.equal(context.rebuilds, 0);
});

test('view changes close an opened door, while same-view resize keeps the chosen pose', () => {
  const { context, button, leaf } = controls();
  const start = source.indexOf('  function setView(name) {');
  const end = source.indexOf('    const outside =', start);
  vm.runInNewContext(`${source.slice(start, end)}\n}`, context);
  context.navigationMode = 'rotate';
  context.currentView = 'dining';
  button.click();
  context.setView('dining');
  assert.equal(leaf.rotation.y, Math.PI);
  context.setView('top');
  assert.equal(leaf.rotation.y, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.match(source, /doorLeaf\.rotation\.y = 0;/);
  assert.match(source, /openAngleDegrees: 0, maxAngleDegrees: 180, nominalWidthFeet: 3/);
});

test('only taps pick the door before floor travel, and the dining warning retains the chair conflict', () => {
  assert.match(source, /if \(tap && !pickPatioDoor\(event\) && !pickHouseDoor\(event\) && !pickVehicleDoor\(event\)\) pickTourFloor\(event\)/);
  assert.match(source, /const tap = !walkDrag\.moved && Math\.hypot/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /id="patio-door-toggle" type="button" aria-pressed="false">Open patio door/);
  assert.match(html, /id="patio-door-state" role="status">Patio door closed/);
  assert.match(html, /even its tucked position conflicts with the sweep/);
});
