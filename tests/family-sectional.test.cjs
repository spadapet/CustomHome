'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../floor-plan-ground.js');

test('family L sectional has five full cushions without counting its corner and preserves measured access gaps', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; }
    add(child) { this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const feature = getLivingRoomFeatureLayout();
  const scene = new Group();
  const context = {
    THREE: { Group, MeshStandardMaterial: class {} }, scene, livingCenterZ: feature.centerZ,
    livingWeaveTexture() {},
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      Object.assign(part, { x, y, z, w, h, d, isMesh: true });
      parent.add(part);
      return part;
    }
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  const familySectional ='), source.indexOf('  const livingLayouts =')), context);
  const sectional = scene.children[0];
  assert.equal(sectional.userData.planningSeats, 5);
  assert.equal(sectional.userData.cornerCounted, false);
  assert.equal(sectional.userData.comfortVerified, false);
  assert.equal(sectional.userData.productSelected, false);
  const seats = sectional.children.filter((part) => part.name === 'L sectional full seating cushion');
  assert.equal(seats.length, 5);
  assert.equal(sectional.children.filter((part) => part.name === 'L sectional uncounted corner cushion').length, 1);
  seats.forEach((seat) => {
    assert.ok(seat.w * 12 >= 27 && seat.d * 12 >= 30, 'Every counted cushion has full seat width and depth');
    assert.equal(seat.userData.tourObstacle, true);
  });

  test('one warm sofa is centered on room bounds facing the fireplace with two flanking chairs', () => {
    class Group {
      constructor() { this.children = []; this.userData = {}; this.rotation = {}; this.position = { set() {} }; }
      add(child) { this.children.push(child); }
      traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
    }
    const scene = new Group();
    const context = {
      THREE: {
        Group,
        MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } },
        Shape: class { absarc() {} lineTo() {} closePath() {} },
        ExtrudeGeometry: class {},
        Mesh: class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material, isMesh: true }); } }
      }, scene, walnut: {},
      getGroundFloorDefaultPlan: require('../floor-plan-ground.js').getGroundFloorDefaultPlan,
      livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(), livingWeaveTexture(color) { return color; },
      box(parent, x, y, z, w, h, d, material) {
        const part = new Group();
        Object.assign(part, { x, y, z, w, h, d, material, isMesh: true });
        parent.add(part);
        return part;
      }
    };
    const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
    vm.createContext(context);
    const loungeSource = source.slice(source.indexOf('  const referenceLounge ='), source.indexOf('  const familySectional ='));
    vm.runInContext(loungeSource, context);
    const lounge = scene.children[0];
    assert.equal(lounge.userData.planningSeats, 5);
    assert.equal(lounge.userData.guestChairs, 2);
    assert.equal(lounge.children.length, 3, 'Only one sofa and two chairs remain');
    const sofaGroups = lounge.children.filter((part) => part.name.startsWith('Reference warm taupe sofa'));
    const chairGroups = lounge.children.filter((part) => part.name.startsWith('Reference muted camel upholstered chair'));
    assert.equal(sofaGroups.length, 1);
    assert.equal(chairGroups.length, 2);
    for (const sofa of sofaGroups) {
      assert.equal(sofa.userData.planningSeats, 3);
      assert.equal(sofa.userData.comfortVerified, false);
      assert.equal(sofa.children.filter((part) => part.name === 'Reference sofa seat cushion').length, 3);
      assert.equal(sofa.children.find((part) => part.name === 'Reference sofa upholstered base').material.map, '#8d7562');
      assert.equal(sofa.children.find((part) => part.name === 'Reference sofa seat cushion').material.map, '#a58b73');
      assert.deepEqual(sofa.children.filter((part) => part.name === 'Reference sofa accent pillow').map((part) => part.material.map), ['#705443', '#b29b7f', '#92745b']);
    }
    for (const chair of chairGroups) {
      assert.equal(chair.children.find((part) => part.name === 'Reference chair upholstered base').material.map, '#a17c58');
      assert.equal(chair.children.find((part) => part.name === 'Reference chair curved upholstered back').material.map, '#a17c58');
    }
    lounge.traverse((part) => { if (part.isMesh) assert.equal(part.userData.tourObstacle, true); });
    assert.doesNotMatch(loungeSource, /referenceRug|referenceCoffeeTable|referenceCart|referenceSideTable|referenceLamp/);
    for (const key of ['rug', 'table', 'cart', 'sideTable']) assert.equal(lounge.userData[key], undefined);
    const { sofas, chairs } = lounge.userData;
    const room = context.getGroundFloorDefaultPlan().rooms.find((item) => item.name === 'Living room');
    assert.equal(sofas.length, 1);
    assert.equal(sofas[0].rotation, -Math.PI / 2);
    assert.equal(sofas[0].x, room.x + room.w / 2);
    assert.equal(sofas[0].z, room.z + room.d / 2);
    for (const sofa of sofas) {
      assert.equal(sofa.w * 12, 90);
      assert.equal(sofa.d * 12, 39);
      assert.ok(sofa.x + sofa.d / 2 < 13.25);
      assert.ok((sofa.x - sofa.d / 2 - 1.38) * 12 > 43);
    }
    assert.equal(chairs.length, 2);
    for (const chair of chairs) {
      assert.equal(chair.rotation, -Math.PI / 2);
      assert.ok(chair.x + 2.75 / 2 < 13.25, 'Keep chair backs out of the main hall strip');
      const endGap = Math.abs(chair.z - sofas[0].z) - 1.25 - sofas[0].w / 2;
      assert.ok(Math.abs(endGap * 12 - 16.2) < 0.001);
      assert.ok(chair.z - 1.25 > room.z);
      assert.ok(chair.z + 1.25 < room.z + room.d);
    }
    assert.doesNotMatch(source.slice(source.indexOf('  const referenceLounge ='), source.indexOf('  const familySectional =')), /referenceSectional|referenceLamp/);
    vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
    assert.equal(vm.runInContext('livingLayouts[0].id', context), 'reference-lounge');
    assert.equal(vm.runInContext('livingLayouts.filter((layout) => layout.recommended).length', context), 1);
    assert.match(source, /place\(referenceLounge, layout\.referenceLounge \? \[0, 0, 0\] : null\)/);
  });
  for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
    assert.ok(Math.abs(seats[i].x - seats[j].x) >= (seats[i].w + seats[j].w) / 2 ||
      Math.abs(seats[i].z - seats[j].z) >= (seats[i].d + seats[j].d) / 2, 'Counted cushions do not overlap');
  }
  const bounds = {
    minX: Math.min(...sectional.children.map((part) => part.x - part.w / 2)),
    maxX: Math.max(...sectional.children.map((part) => part.x + part.w / 2)),
    minZ: Math.min(...sectional.children.map((part) => part.z - part.d / 2)),
    maxZ: Math.max(...sectional.children.map((part) => part.z + part.d / 2))
  };
  assert.ok(Math.abs((bounds.maxX - bounds.minX) * 12 - 104) < 0.001);
  assert.ok(Math.abs((bounds.maxZ - bounds.minZ) * 12 - 144) < 0.001);
  assert.ok((bounds.minZ - feature.wallStartZ) * 12 >= 39.5);
  assert.ok((feature.wallEndZ - bounds.maxZ) * 12 >= 39.5);
  assert.ok((bounds.minX - 1.38) * 12 >= 28.2, 'Return clears the full-length closed cabinet front');
  const ottoman = { x: 6.0666667, z: feature.centerZ + 1.5, w: 32 / 12, d: 4 };
  const mainFront = 10.5666667 - 44 / 24;
  assert.ok(Math.abs((mainFront - ottoman.x - ottoman.w / 2) * 12 - 16) < 0.001);
  assert.ok((ottoman.z - ottoman.d / 2 - (feature.centerZ - 25 / 6 + 44 / 24)) * 12 >= 21.9);
  assert.ok(bounds.maxX < 13.25, 'Sectional leaves the existing hall circulation strip clear');
  assert.match(source, /place\(familySectional, layout\.familySectional \? \[0, 0, 0\] : null\)/);
});
