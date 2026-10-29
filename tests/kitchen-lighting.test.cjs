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
    this.visible = true;
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
}
class SpotLight extends Group {
  constructor(color, intensity, distance, angle, penumbra, decay) {
    super();
    Object.assign(this, { color, intensity, distance, angle, penumbra, decay });
    this.target = new Group();
  }
}
function build() {
  const material = { clone() { return { ...this }; } };
  const context = {
    THREE: { Group, Mesh, SpotLight, CylinderGeometry: class {}, TorusGeometry: class {}, DoubleSide: 2 },
    ...Object.fromEntries(['scene', 'cooktopUppers', 'cooktopHood', 'islandPendants', 'familyBoard', 'kitchenSconces'].map((name) => [name, new Group()])),
    kitchenTaskDiffuser: { emissiveIntensity: 0 }, black: material, windowTrim: material, brass: material,
    cooktopUpperBottom: 4.55, hoodBottom: 6.3, cooktopCenterZ: 16.95, kitchenCenterZ: 16.95, ceilingHeight: 9,
    activeFloor: 'ground', groundLayoutPreview: null, nightLighting: true, currentView: 'kitchen', islandLightsInput: { checked: true },
    box(parent, x, y, z, width, height, depth, material) {
      const part = new Mesh({ width, height, depth }, material);
      part.position.set(x, y, z);
      parent.add(part);
      return part;
    },
    cylinder(parent, x, y, z, radius, height, material) { return context.box(parent, x, y, z, radius * 2, height, radius * 2, material); }
  };
  context.cooktopUppers.add(new Group(), new Group());
  for (let index = 0; index < 2; index++) {
    const light = new Group();
    light.name = 'Warm wall accent light';
    light.isLight = true;
    context.kitchenSconces.add(light);
    const shade = new Mesh({}, { emissiveIntensity: 0 });
    shade.name = 'Aleena ivory wall-backed half-oval fabric shade';
    context.kitchenSconces.add(shade);
  }
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function buildKitchenLighting()'), source.indexOf('  const upstairsHelpers =')), context);
  vm.runInContext(source.slice(source.indexOf('  function updatePendantVisibility()'), source.indexOf('  function setView(')), context);
  context.kitchenPracticalLights = context.buildKitchenLighting();
  return context;
}
const find = (root, pattern) => {
  const results = [];
  root.traverse((part) => { if (pattern.test(part.name ?? '')) results.push(part); });
  return results;
};

test('four small regressed downlights supplement under-cabinet, hood, pendant and board lighting', () => {
  const model = build();
  const rig = model.kitchenPracticalLights;
  assert.equal(rig.ceilingFixtures.children.length, 4);
  assert.equal(rig.lights.length, 11);
  assert.equal(rig.group.userData.apertureInches, 4);
  assert.equal(rig.group.userData.photometryVerified, false);
  assert.equal(find(model.cooktopUppers, /under-cabinet task beam/).length, 2);
  assert.equal(find(model.cooktopHood, /hood task beam/).length, 1);
  assert.equal(find(model.islandPendants, /pendant task beam/).length, 2);
  assert.equal(find(model.familyBoard, /soft wash beam/).length, 2);
  for (const lamp of find(model.familyBoard, /soft wash beam/)) {
    assert.ok(lamp.distance > Math.hypot(lamp.position.y - 2.5, lamp.position.z - 0.07) + 2, 'Do not clip the lower half of the board with the light range');
  }
  for (const lamp of rig.lights) {
    assert.equal(lamp.penumbra, 1);
    assert.ok(lamp.target.position.y < lamp.position.y, 'Light aims below its source, not toward the viewer');
    assert.ok(lamp.position.y < 9, 'Actual light sources are inside the room');
    assert.equal(lamp.target.parent, lamp.parent, 'Targets share the rotated fixture coordinate system');
  }
});

test('Night energizes the layers; Day switches them off; other floors and plans do not leak light', () => {
  const model = build();
  for (const [floor, view, night, expected] of [
    ['ground', 'kitchen', true, true], ['ground', 'kitchen', false, false],
    ['ground', 'whole', true, true], ['ground', 'hall', true, true],
    ['upstairs', 'upstairs', true, false], ['exterior', 'exterior', true, false],
    ['ground', 'top', true, false], ['ground', 'basement', true, false]
  ]) {
    Object.assign(model, { activeFloor: floor, currentView: view, nightLighting: night });
    model.updateKitchenLighting();
    for (const lamp of model.kitchenPracticalLights.lights) {
      assert.equal(lamp.visible, expected, `${floor}/${view}/${night}`);
      assert.equal(lamp.intensity, expected ? lamp.userData.nightIntensity : 0);
    }
    assert.equal(model.kitchenTaskDiffuser.emissiveIntensity > 0, expected);
    for (const lamp of find(model.kitchenSconces, /Warm wall accent light/)) {
      assert.equal(lamp.visible, expected);
      assert.equal(lamp.intensity, expected ? 12 : 0);
    }
    for (const shade of find(model.kitchenSconces, /Aleena ivory/)) assert.equal(shade.material.emissiveIntensity > 0, expected);
  }
  model.groundLayoutPreview = {};
  model.currentView = 'whole';
  model.updateKitchenLighting();
  assert.equal(model.kitchenPracticalLights.group.visible, false, 'Saved structural previews do not display uncoordinated lighting');
});

test('inspection views hide ceiling/pendant hardware without removing task illumination and restore it afterward', () => {
  const model = build();
  for (const view of ['cooktop', 'fridge', 'sink-storage']) {
    model.currentView = view;
    model.updateKitchenLighting();
    assert.equal(model.kitchenPracticalLights.ceilingFixtures.visible, false);
    assert.equal(model.islandPendants.visible, false);
    assert.ok(model.kitchenPracticalLights.lights.every((lamp) => lamp.intensity > 0));
  }
  model.currentView = 'kitchen';
  model.updateKitchenLighting();
  assert.equal(model.kitchenPracticalLights.ceilingFixtures.visible, true);
  assert.equal(model.islandPendants.visible, true);
  assert.match(source, /if \(nightLighting\) islandLightsInput\.checked = true/);
  assert.match(source, /islandLightsInput\.checked = nightLighting \? true : daytimeIslandLights/);
});

test('returning to Night enables pendants and returning to Day restores the saved daytime visibility', () => {
  let change;
  const nightInput = { checked: true, addEventListener(name, callback) { assert.equal(name, 'change'); change = callback; } };
  const input = { checked: false };
  let renders = 0;
  const context = {
    islandLightsInput: input,
    nightLightingInput: nightInput,
    render() { renders++; }
  };
  const start = source.indexOf('  nightLightingInput.disabled = false;');
  const end = source.indexOf('\n  });', start) + '\n  });'.length;
  vm.runInNewContext('let nightLighting = true; let daytimeIslandLights = false;\n' + source.slice(start, end), context);
  nightInput.checked = false;
  change();
  assert.equal(input.checked, false);
  input.checked = true;
  nightInput.checked = true;
  change();
  assert.equal(input.checked, true);
  input.checked = false;
  nightInput.checked = false;
  change();
  assert.equal(input.checked, true, 'Day restores the preference saved before entering Night');
  nightInput.checked = true;
  change();
  assert.equal(input.checked, true, 'Night always starts with pendants enabled');
  assert.equal(renders, 4);
});
