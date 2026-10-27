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
    this.rotation = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
  }
  add(...children) { children.forEach((child) => { child.parent = this; this.children.push(child); }); }
}

function build() {
  const context = {
    THREE: {
      Group,
      Mesh: class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } },
      TorusGeometry: class { constructor(radius, tube) { Object.assign(this, { radius, tube }); } },
      CylinderGeometry: class { constructor(radiusTop, radiusBottom, height) { Object.assign(this, { radiusTop, radiusBottom, height }); } },
      DoubleSide: 2,
      MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } },
      SpotLight: class extends Group {
        constructor(color, intensity, distance, angle, penumbra, decay) {
          super();
          Object.assign(this, { color, intensity, distance, angle, penumbra, decay, target: new Group() });
        }
      }
    },
    scene: new Group(), piano: new Group(), referenceEndTable: new Group(),
    guestVanity: { children: [{ name: 'Guest bathroom warm vanity light', intensity: 8, visible: true }, { name: 'Guest bathroom warm vanity light', intensity: 8, visible: true }] },
    powderGlow: { emissiveIntensity: 0.45 },
    upstairs: { group: Object.assign(new Group(), { userData: { ceilingHeightFeet: 9 } }), rooms: [{ name: 'Bedroom 2', x: 31, z: 10, w: 13, d: 12 }] },
    getGroundFloorDefaultPlan: require('../floor-plan-ground.js').getGroundFloorDefaultPlan,
    cream: {}, brass: {}, rosewood: {}, windowTrim: {}, black: { clone() { return {}; } }, ceilingHeight: 9, garageFloorY: -1.25,
    nightLighting: true, activeFloor: 'ground', currentView: 'living', groundLayoutPreview: null,
    cylinder(parent, x, y, z, radius, height, material) {
      const mesh = new Group();
      Object.assign(mesh, { radius, height, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    box(parent) { const mesh = new Group(); parent.add(mesh); return mesh; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function buildHomeLighting()'), source.indexOf('  const upstairsHelpers =')), context);
  context.homeLighting = context.buildHomeLighting();
  return context;
}

test('guest vanity real lights and night glow restore across Day/Night, plans and floors', () => {
  const model = build();
  for (const [floor, view, night, expected] of [
    ['ground', 'whole', true, true], ['ground', 'whole', false, false],
    ['upstairs', 'upstairs', true, false], ['ground', 'top', true, false],
    ['exterior', 'exterior-front', true, false], ['ground', 'guest-suite', true, true]
  ]) {
    Object.assign(model, { activeFloor: floor, currentView: view, nightLighting: night });
    model.updateHomeLighting();
    for (const rig of model.homeLighting) {
      assert.equal(rig.lamp.visible, rig.group.visible && night);
    }
    for (const lamp of model.guestVanity.children) {
      assert.equal(lamp.visible, expected);
      assert.equal(lamp.intensity, expected ? 8 : 0);
    }
    assert.equal(model.powderGlow.emissiveIntensity, expected ? 0.45 : 0);
  }
});

test('warm deep-regressed cans cover both floors with separate unchanged low-output task lamps', () => {
  const model = build();
  const rigs = model.homeLighting;
  assert.ok(rigs.length > 20);
  assert.equal(rigs.filter((rig) => rig.task).length, 2);
  assert.ok(rigs.some((rig) => rig.floor === 'upstairs'));
  assert.equal(rigs.filter((rig) => rig.group.name.startsWith('Garage')).length, 3);
  for (const rig of rigs) {
    assert.equal(rig.group.userData.colorTemperatureKelvin, 2700);
    assert.equal(rig.group.userData.glareVerified, false);
    assert.equal(rig.lamp.penumbra, 1);
    assert.equal(rig.lamp.target.parent, rig.group);
    assert.ok(rig.lamp.target.position.y < rig.lamp.position.y);
    if (rig.task) {
      assert.ok(rig.group.children.some((part) => part.name === 'Opaque shielding shade'));
      assert.ok(rig.group.children.some((part) => part.name === 'Recessed frosted underside'));
    } else {
      assert.equal(rig.group.userData.apertureInches, 4);
      assert.equal(rig.group.userData.regressedLensInches, 2);
      assert.equal(rig.group.userData.purpose, 'Whole-room ambient only');
      assert.equal(rig.group.position.y, rig.group.name.startsWith('Garage') ? 7.75 : 9);
      const baffle = rig.group.children.find((part) => part.name === 'Deep recessed dark shielding baffle');
      const lens = rig.group.children.find((part) => part.name === 'Deep-regressed frosted lens');
      assert.ok(baffle && lens);
      assert.ok(Math.abs(baffle.geometry.radiusTop * 24 - 4) < 1e-9);
      assert.ok(Math.abs((baffle.position.y - baffle.geometry.height / 2) * 12) < 1e-9, 'Baffle starts at the ceiling aperture');
      assert.ok(Math.abs((lens.position.y - lens.height / 2) * 12 - 2) < 1e-9, 'Lens underside is recessed two inches, not a flush wafer');
      assert.equal(rig.lamp.angle, Math.PI / 4, 'Wide vertical ambient beam, not a narrow accent spot');
      assert.equal(rig.lamp.target.position.x, 0);
      assert.equal(rig.lamp.target.position.z, 0);
      assert.ok(!rig.group.children.some((part) => part.name === 'Opaque shielding shade'));
    }
    assert.ok(!rig.task || rig.intensity <= 4);
  }
});

test('Night/Day, floor changes, plans and inspection views correctly gate and restore home fixtures', () => {
  const model = build();
  for (const floor of ['ground', 'upstairs', 'exterior']) {
    for (const night of [true, false]) {
      Object.assign(model, { activeFloor: floor, nightLighting: night, currentView: 'whole' });
      model.updateHomeLighting();
      for (const rig of model.homeLighting) assert.equal(rig.lamp.intensity > 0, night && rig.floor === floor);
    }
  }
  Object.assign(model, { activeFloor: 'ground', nightLighting: true });
  for (const view of ['top', 'upstairs-top', 'basement']) {
    model.currentView = view;
    model.updateHomeLighting();
    assert.ok(model.homeLighting.every((rig) => !rig.group.visible && rig.lamp.intensity === 0));
  }
  model.currentView = 'cooktop';
  model.updateHomeLighting();
  assert.ok(model.homeLighting.filter((rig) => !rig.task).every((rig) => !rig.group.visible));
  model.currentView = 'living';
  model.updateHomeLighting();
  assert.ok(model.homeLighting.filter((rig) => rig.floor === 'ground').every((rig) => rig.group.visible));
  model.groundLayoutPreview = {};
  model.updateHomeLighting();
  assert.ok(model.homeLighting.every((rig) => !rig.group.visible && rig.lamp.intensity === 0));
});

test('stair LED strips and tread washes turn on in Night and restore after floor and plan changes', () => {
  const washes = [{ name: 'Interior stair LED tread wash', intensity: 0 }, { name: 'Interior stair LED tread wash', intensity: 0 }];
  const context = {
    nightLighting: true, activeFloor: 'ground', currentView: 'stairs', groundLayoutPreview: null,
    stairStepGlow: { emissiveIntensity: 0 },
    stairs: { traverse(callback) { washes.forEach(callback); } }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function updateStairLighting()'), source.indexOf('  const upstairsHelpers =')), context);
  for (const [floor, view, night, preview, expected] of [
    ['ground', 'stairs', true, null, true], ['upstairs', 'upstairs', true, null, true],
    ['ground', 'stairs', false, null, false], ['ground', 'top', true, null, false],
    ['upstairs', 'upstairs-top', true, null, false], ['ground', 'basement', true, null, false],
    ['exterior', 'exterior', true, null, false], ['ground', 'whole', true, {}, false],
    ['ground', 'stairs', true, null, true]
  ]) {
    Object.assign(context, { activeFloor: floor, currentView: view, nightLighting: night, groundLayoutPreview: preview });
    context.updateStairLighting();
    assert.equal(context.stairStepGlow.emissiveIntensity, expected ? 0.8 : 0);
    washes.forEach((light) => {
      assert.equal(light.visible, expected);
      assert.equal(light.intensity, expected ? 0.8 : 0);
    });
  }
  assert.match(source, /updateHomeLighting\(\);\s+updateStairLighting\(\);/);
});
