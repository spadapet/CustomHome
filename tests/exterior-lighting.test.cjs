'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const exteriorSource = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
const viewerSource = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

test('exterior daylight isolates the raking sun, sky and exposure and restores both interior modes', () => {
  const context = {
    activeFloor: 'exterior', nightLighting: false, exteriorSun: {}, scene: {},
    outdoorSky: {}, indoorBackground: {}, outdoorReflection: { texture: {} },
    ambientLight: {}, studioFill: {}, renderer: {}
  };
  const start = viewerSource.indexOf('    const exteriorDaylight =');
  const end = viewerSource.indexOf('    mudroomKeyLight.visible', start);
  assert.ok(start >= 0 && end > start, 'Shared lighting settings must exist');
  const code = viewerSource.slice(start, end);
  function apply(floor, night) {
    context.activeFloor = floor; context.nightLighting = night;
    vm.runInNewContext(`{${code}}`, context);
  }
  apply('exterior', false);
  assert.equal(context.exteriorSun.visible, true);
  assert.equal(context.scene.environment, context.outdoorReflection.texture);
  assert.equal(context.ambientLight.intensity, 0.55);
  assert.equal(context.renderer.toneMappingExposure, 0.95);
  assert.equal(context.studioFill.intensity, 0);
  assert.equal(context.studioFill.visible, false);
  for (const floor of ['ground', 'upstairs', 'exterior', 'ground']) {
    apply(floor, true);
    assert.equal(context.exteriorSun.visible, false);
    assert.equal(context.scene.environment, null);
    assert.equal(context.scene.background, context.indoorBackground);
    assert.equal(context.renderer.toneMappingExposure, 0.9);
    assert.equal(context.ambientLight.intensity, 0.8);
    assert.equal(context.studioFill.intensity, 325);
    assert.equal(context.studioFill.visible, true);
  }
  for (const floor of ['ground', 'upstairs']) {
    apply(floor, false);
    assert.equal(context.scene.environment, null);
    assert.equal(context.renderer.toneMappingExposure, 1.25);
    assert.equal(context.ambientLight.intensity, 2.5);
    assert.equal(context.studioFill.intensity, 650);
    assert.equal(context.studioFill.visible, true);
  }
  apply('exterior', false);
  assert.equal(context.exteriorSun.visible, true);
  assert.equal(context.renderer.toneMappingExposure, 0.95);
});

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.rotation = { y: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
    this.position = {
      x: 0, y: 0, z: 0,
      set(x, y, z) { Object.assign(this, { x, y, z }); },
      copy(other) { Object.assign(this, { x: other.x, y: other.y, z: other.z }); return this; }
    };
    this.quaternion = { setFromUnitVectors() {} };
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse(callback); }
}

class Vector {
  constructor(x, y, z) { Object.assign(this, { x, y, z }); }
  clone() { return new Vector(this.x, this.y, this.z); }
  sub(other) { this.x -= other.x; this.y -= other.y; this.z -= other.z; return this; }
  add(other) { this.x += other.x; this.y += other.y; this.z += other.z; return this; }
  multiplyScalar(value) { this.x *= value; this.y *= value; this.z *= value; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const length = this.length(); this.x /= length; this.y /= length; this.z /= length; return this; }
}

class Mesh extends Group {
  constructor(geometry, material) { super(); Object.assign(this, { isMesh: true, geometry, material }); }
}

function buildLighting() {
  const group = new Group();
  const context = {
    HomeRoof: require('../floor-plan-roof.js'), floorToFloor: 10, garageFloorY: -1.25, wallThickness: 0.45, white: {},
    measuredUpper: require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry(),
    frontShift: require('../floor-plan-ground.js').getGroundFrontLayout().extension,
    frontWallZ: require('../floor-plan-ground.js').getGroundFrontLayout().wallZ,
    THREE: {
      Group, Mesh, Vector3: Vector,
      CylinderGeometry: class {
        constructor(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded) {
          this.parameters = { radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded };
        }
      },
      SpotLight: class extends Group {
        constructor(color, intensity, distance, angle, penumbra, decay) {
          super();
          Object.assign(this, { isLight: true, color, intensity, distance, angle, penumbra, decay, target: new Group() });
        }
      }
    },
    group, dark: {}, mat: () => ({ metalness: 0 }), glow: { emissiveIntensity: 0.8, emissive: { getHex: () => 0xffbf68 } }, patioGrade: -1.625,
    patioRoofCenterX: 6.6, patioRoofWidth: 13.2, livingPatioCenterZ: 3.725,
    patioRoofUndersideAt: (z) => 8.26780663414694 + z * 3 / 16,
    westGateCenterX: -10.605, westFenceReturnZ: 45, eastFenceReturnZ: 41, garageSideDoorCenterZ: 45.5,
    box(parent, x, y, z, width, height, depth, material) {
      const mesh = new Group();
      Object.assign(mesh, { isMesh: true, material, width, height, depth, geometry: { width, height, depth } });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
  };
  vm.createContext(context);
  vm.runInContext(exteriorSource.match(/  const canopyLightXs = .*;/)[0], context);
  vm.runInContext(exteriorSource.slice(exteriorSource.indexOf('  const canopyDepth ='), exteriorSource.indexOf('  function canopySection(')), context);
  vm.runInContext(exteriorSource.slice(exteriorSource.indexOf('  const porchCanopyHeight ='), exteriorSource.indexOf('  const porchMetal =')), context);
  vm.runInContext(exteriorSource.slice(exteriorSource.indexOf('  const lighting ='), exteriorSource.indexOf('  const cameras =')), context);
  return { group, context, lighting: group.children[0] };
}

test('warm downward fixtures cover entrances, side paths, garden and patio without path posts', () => {
  const { lighting, context } = buildLighting();
  const fixtures = lighting.children.filter((part) => part.userData.mount);
  const sources = lighting.children.filter((part) => part.isLight);
  assert.equal(fixtures.length, 30);
  assert.equal(sources.length, 30);
  assert.equal(fixtures.filter((part) => part.userData.mount === 'wall').length, 13);
  for (const fixture of fixtures) {
    assert.equal(fixture.userData.colorTemperatureKelvin, 2700);
    assert.equal(fixture.userData.downwardOnly, true);
    assert.equal(fixture.userData.productSelected, false);
  }
  for (const source of sources) {
    assert.ok(source.target.position.y < source.position.y, 'No upward beam');
    assert.ok(source.target.position.x >= -12.605 && source.target.position.x <= 62.395, 'Aim stays within the modeled lot');
    assert.ok(source.target.position.z >= -32.325 && source.target.position.z <= 97.675);
    assert.equal(source.decay, 2);
    assert.ok(!source.castShadow, 'Do not add costly exterior shadow maps');
  }
  for (const source of sources.filter((part) => part.name.startsWith('Garage door '))) {
    assert.equal(source.position.y, context.garageFloorY + 9.15);
    assert.equal(source.target.position.y, context.garageFloorY + 4);
    assert.equal(source.target.position.z, 49 + context.wallThickness / 2 - 0.05);
  }
  for (const phrase of ['Front porch', 'Front door', 'West side-path', 'East side-path', 'Rear kitchen garden', 'Rear prep garden', 'Dining patio steps', 'Open-patio approach']) {
    assert.ok(fixtures.some((part) => part.name.includes(phrase)), phrase);
  }
  assert.doesNotMatch(exteriorSource, /name = ['"][^'"]*(?:bollard|path-post light)/i);
});

test('wall lights have correctly oriented mounting plates and porch housings meet the sloping canopy', () => {
  const { lighting, context } = buildLighting();
  const fixtures = lighting.children.filter((part) => part.userData.mount);
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);
  for (const fixture of fixtures.filter((part) => part.userData.mount === 'wall')) {
    const garage = fixture.name.startsWith('Garage door ');
    const plate = fixture.children.find((part) => part.name === (garage
      ? 'Garage gooseneck bronze mounting plate' : 'Exterior downlight wall backplate'));
    assert.ok(plate);
    const wallX = fixture.position.x - Math.sin(fixture.rotation.y) * 0.25;
    const wallZ = fixture.position.z - Math.cos(fixture.rotation.y) * 0.25;
    if (garage) {
      close(fixture.position.x, fixture.name.includes('1 ') ? 37 : 48.5);
      close(fixture.position.y, context.garageFloorY + 9);
      close(wallZ, 49.225);
      close(fixture.position.z - 0.2 - plate.depth / 2, 49 + 0.45 / 2);
      close((fixture.position.y - plate.height / 2) - (context.garageFloorY + 8 + 2 / 3 + 0.06 + 0.06), 0.06333333333333346);
      assert.equal(fixture.userData.style, 'bronze gooseneck');
      const arms = fixture.children.filter((part) => part.name === 'Garage gooseneck bronze arm segment');
      assert.equal(arms.length, 4);
      assert.ok(arms.every((part) => part.geometry.parameters.radiusTop === 0.035));
      assert.ok(fixture.children.some((part) => part.name === 'Garage gooseneck downward shade'));
      assert.ok(fixture.children.some((part) => part.name === 'Garage gooseneck warm diffuser'));
    } else if (fixture.name.startsWith('West')) close(wallX, -0.225);
    else if (fixture.name.startsWith('East')) close(wallX, 55.725);
    else if (fixture.name.startsWith('Dining patio')) close(wallX, 12.975);
    else if (fixture.name.startsWith('Front door')) close(wallZ, context.frontWallZ + 0.425);
    else if (fixture.name.startsWith('Driveway')) close(wallZ, 49.225);
    else if (fixture.name.startsWith('Rear dining')) close(wallZ, -0.325);
    else close(wallZ, 6.775);
  }
  for (const fixture of fixtures.filter((part) => part.name === 'Front porch approach ceiling light')) {
    close(fixture.position.y + 0.075, context.porchCanopyUndersideAt(fixture.position.z));
  }
  const upper = fixtures.filter(part => part.userData.mount === 'upper soffit recessed');
  assert.equal(upper.length, 12);
  for (const fixture of upper) {
    close(fixture.position.y, fixture.userData.soffitUndersideFeet);
    const [housing, lens] = fixture.children;
    assert.ok(housing.position.y + housing.height * housing.scale.y / 2 < 0.16);
    assert.ok(lens.position.y - lens.height / 2 < 0);
  }
  const roof = require('../floor-plan-roof.js');
  const plan = roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions().filter(d =>
    !['Garage hip', 'Garage front gable', 'Dining rear projection'].includes(d.id)));
  for (const fixture of upper.slice(-2)) {
    const { x, y, z } = fixture.position;
    close(x, context.measuredUpper.east + .45);
    assert.ok(x > context.measuredUpper.east + .225, 'Lens is beyond finished upper wall, not in attic');
    const face = plan.faces.find(f => roof.contains(f.polygon, [x, z]));
    close(y, roof.heightAt(face.plane, [x, z]) - .16);
  }
  for (const fixture of fixtures.filter((part) => /patio ceiling light|Open-patio approach ceiling/.test(part.name))) {
    close(fixture.position.y + 0.075, context.patioRoofUndersideAt(fixture.position.z) - 0.75 - 0.04);
  }
});

test('Day/Night and floor changes gate every exterior light and shared glowing surface without losing intensities', () => {
  const { group, lighting } = buildLighting();
  const extraGlow = { emissiveIntensity: 0.35, emissive: { getHex: () => 0xffcf8c } };
  const opaqueMaterial = { emissiveIntensity: 1, emissive: { getHex: () => 0 } };
  const marker = new Group();
  marker.material = [opaqueMaterial, extraGlow];
  const stepWash = Object.assign(new Group(), { isLight: true, intensity: 1.4 });
  group.add(marker, stepWash);
  const context = { exterior: group, nightLighting: true, activeFloor: 'exterior' };
  vm.createContext(context);
  const start = viewerSource.indexOf('  const exteriorLighting =');
  const end = viewerSource.indexOf('  const floorGrid =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(viewerSource.slice(start, end), context);
  const sources = lighting.children.filter((part) => part.isLight);
  const original = sources.map((lamp) => lamp.intensity);
  for (const [night, floor] of [[true, 'exterior'], [false, 'exterior'], [true, 'ground'], [true, 'upstairs'], [true, 'exterior']]) {
    Object.assign(context, { nightLighting: night, activeFloor: floor });
    context.updateExteriorLighting();
    sources.forEach((lamp, index) => assert.equal(lamp.intensity, night && floor === 'exterior' ? original[index] : 0));
    assert.equal(extraGlow.emissiveIntensity, night && floor === 'exterior' ? 0.35 : 0);
    assert.equal(stepWash.intensity, night && floor === 'exterior' ? 1.4 : 0);
    assert.equal(opaqueMaterial.emissiveIntensity, 1, 'Leave non-glowing material defaults untouched');
  }
  assert.match(viewerSource, /updateStairLighting\(\);\s+updateExteriorLighting\(\);/);
});
