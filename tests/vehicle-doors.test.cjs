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
    this.rotation = { y: 0 };
    this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
  }
  add(part) { this.children.push(part); }
}

function buildVehicles() {
  const cars = [];
  const context = {
    THREE: { Group, MeshStandardMaterial: class {} }, garageFloorY: -1.25,
    black: {}, steel: {}, light: {}, mat() { return {}; },
    furnishing(name, x, z) {
      const car = new Group();
      Object.assign(car, { name, x, z });
      cars.push(car);
      return car;
    },
    box(parent, x, y, z, w, h, d) {
      const part = { x, y, z, w, h, d, userData: {} };
      parent.add(part);
      return part;
    },
    cylinder() { return { rotation: {} }; }
  };
  const start = source.indexOf('  function vehicle(');
  const end = source.indexOf('  for (const x of [32.5, 41.5, 44, 53])', start);
  vm.runInNewContext(source.slice(start, end), context);
  return cars;
}

test('both unchanged vehicle envelopes carry four independently hinged estimated door panels', () => {
  const cars = buildVehicles();
  assert.deepEqual(cars.map(({ x, z }) => [x, z]), [[48.5, 38], [37, 40]]);
  for (const car of cars) {
    const doors = car.children.filter((part) => part.userData?.vehicleDoor);
    assert.equal(doors.length, 4);
    assert.equal(new Set(doors.map((door) => `${door.userData.side}:${door.userData.row}`)).size, 4);
    for (const door of doors) {
      assert.equal(door.userData.angleDegrees, 0);
      assert.equal(door.userData.manufacturerVerified, false);
      const length = door.userData.row === 'front' ? 44 : 36;
      assert.equal(door.userData.doorLengthInches, length);
      assert.equal(door.children[0].d, length / 12);
      assert.equal(door.children[0].z, length / 24);
      const projection = Math.sin(Math.PI / 3) * length;
      assert.ok(projection > (length === 44 ? 38 : 31));
      assert.equal(Math.sign(door.position.x), door.userData.side);
    }
  }
});

test('door-mounted buttons toggle only their own panel, announce assumptions and restore closed pose', () => {
  const cars = buildVehicles();
  const buttons = [];
  let renders = 0;
  const status = {};
  const context = {
    bmw: cars[1], sierra: cars[0], viewport: { append(button) { buttons.push(button); } },
    document: {
      getElementById() { return status; },
      createElement() {
        return {
          attributes: {}, listeners: {},
          setAttribute(key, value) { this.attributes[key] = value; },
          getAttribute(key) { return this.attributes[key]; },
          addEventListener(name, callback) { this.listeners[name] = callback; }
        };
      }
    },
    THREE: { MathUtils: { degToRad: (angle) => angle * Math.PI / 180 } },
    render() { renders++; }
  };
  const start = source.indexOf('  const vehicleDoorControls =');
  const end = source.indexOf('  function updateVehicleDoorControls()', start);
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(buttons.length, 8);
  assert.ok(buttons.every((button) => button.textContent === 'Door'));
  const doors = cars[1].children.filter((part) => part.userData?.vehicleDoor);
  buttons[0].listeners.click({ stopPropagation() {} });
  assert.equal(buttons[0].attributes['aria-pressed'], 'true');
  assert.equal(doors[0].userData.angleDegrees, 60);
  assert.ok(Math.abs(doors[0].rotation.y + Math.PI / 3) < 1e-9);
  assert.equal(doors[1].rotation.y, 0);
  assert.match(status.textContent, /not manufacturer verified/);
  buttons[0].listeners.click({ stopPropagation() {} });
  assert.equal(doors[0].userData.angleDegrees, 0);
  assert.equal(buttons[0].attributes['aria-pressed'], 'false');
  assert.equal(renders, 2);
});

test('direct panel picking toggles the nearest visible door, never a door behind a wall', () => {
  const door = { visible: true };
  const panel = { visible: true, parent: door };
  const wall = { visible: true };
  let hits = [{ object: panel }];
  let clicks = 0;
  const context = {
    vehicleDoorStatus: { hidden: false },
    visiblePickTargets() { return []; },
    renderer: { domElement: { getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } } },
    scene: { children: [], updateMatrixWorld() {} }, camera: { updateMatrixWorld() {} },
    vehicleDoorControls: [{ door, button: { click() { clicks++; } } }],
    THREE: { Vector2: class {}, Raycaster: class { setFromCamera() {} intersectObjects() { return hits; } } }
  };
  const start = source.indexOf('  function pickVehicleDoor(event)');
  const end = source.indexOf('  const charger =', start);
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(context.pickVehicleDoor({ clientX: 50, clientY: 50 }), true);
  assert.equal(clicks, 1);
  hits = [{ object: wall }, { object: panel }];
  assert.equal(context.pickVehicleDoor({ clientX: 50, clientY: 50 }), false);
  wall.visible = false;
  assert.equal(context.pickVehicleDoor({ clientX: 50, clientY: 50 }), true);
  context.vehicleDoorStatus.hidden = true;
  assert.equal(context.pickVehicleDoor({ clientX: 50, clientY: 50 }), false);
  assert.equal(clicks, 2);
  assert.match(source, /if \(tap && !pickPatioDoor\(event\) && !pickHouseDoor\(event\) && !pickVehicleDoor\(event\)\) pickTourFloor\(event\)/);
});
