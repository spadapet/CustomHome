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

  test('warm seating replaces the loveseat with the dimensioned piano and retains the centered end table', () => {
    class Group {
      constructor() { this.children = []; this.userData = {}; this.rotation = {}; this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; }
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
      }, scene, walnut: {}, oak: {},
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
    assert.equal(lounge.children.length, 5, 'Sofa, piano, two chairs and one end table');
    const piano = lounge.children.find((part) => part.name === 'Yamaha CLP-825 Rosewood digital piano');
    assert.ok(piano);
    assert.equal(piano.userData.widthMm, 1350);
    assert.equal(piano.userData.depthMm, 411);
    assert.equal(piano.userData.heightMm, 849);
    assert.equal(piano.rotation.y, Math.PI / 2);
    assert.ok(Math.abs(piano.position.x - 411 / 304.8 / 2 - 0.4) < 1e-9, 'Back retains a wall/trim service gap');
    assert.ok(Math.abs(piano.position.z - 23.655) < 1e-9, 'Centered in the removed left cabinet run');
    const halfWidth = 1350 / 304.8 / 2;
    assert.ok(piano.position.z - halfWidth > 20.535, 'Cabinet stays clear of the fireplace stone');
    assert.ok(piano.position.z + halfWidth < 26.775, 'Cabinet stays out of the stair opening');
    const bench = piano.children.find((part) => part.name.startsWith('Piano bench -'));
    assert.equal(bench.position.z, 1.3, 'Preserve the tucked piano bench pose');
    const benchMinZ = piano.position.z - 1;
    assert.ok(benchMinZ - 10.2 - 33 / 24 > 10, 'Chair pair no longer crowds the piano bench');
    assert.equal(piano.children.filter((part) => part.name === 'Piano ivory-tone white key').length, 52);
    assert.equal(piano.children.filter((part) => part.name === 'Piano raised black key').length, 36);
    const sofaGroups = lounge.children.filter((part) => /sofa|loveseat/.test(part.name));
    const chairGroups = lounge.children.filter((part) => part.name.startsWith('Reference warm oatmeal upholstered chair'));
    assert.equal(sofaGroups.length, 1);
    assert.equal(chairGroups.length, 2);
    for (const [index, sofa] of sofaGroups.entries()) {
      assert.equal(sofa.userData.planningSeats, index === 0 ? 3 : 2);
      assert.equal(sofa.userData.comfortVerified, false);
      assert.equal(sofa.children.filter((part) => part.name === 'Reference sofa seat cushion').length, index === 0 ? 3 : 2);
      assert.equal(sofa.children.filter((part) => part.name === 'Reference sofa loose back cushion').length, index === 0 ? 3 : 2);
      for (const part of sofa.children) {
        assert.ok(part.x - part.w / 2 >= -sofa.userData.w / 2, 'No old full-sofa plinth, arm or cushion projects beyond the loveseat');
        assert.ok(part.x + part.w / 2 <= sofa.userData.w / 2);
      }
      assert.equal(sofa.children.find((part) => part.name === 'Reference sofa upholstered base').material.map, index === 0 ? '#9e8a76' : '#514840');
      assert.equal(sofa.children.find((part) => part.name === 'Reference sofa seat cushion').material.map, index === 0 ? '#b49f88' : '#62584e');
      assert.deepEqual(sofa.children.filter((part) => part.name === 'Reference sofa accent pillow').map((part) => part.material.map), ['#705443', '#b29b7f', '#92745b']);
    }
    for (const chair of chairGroups) {
      assert.equal(chair.children.find((part) => part.name === 'Reference chair upholstered base').material.map, '#b5a087');
      assert.equal(chair.children.find((part) => part.name === 'Reference chair curved upholstered back').material.map, '#b5a087');
    }
    lounge.traverse((part) => { if (part.isMesh) assert.equal(part.userData.tourObstacle, true); });
    assert.doesNotMatch(loungeSource, /referenceRug|referenceCoffeeTable|referenceCart|referenceSideTable|referenceLamp/);
    for (const key of ['rug', 'table', 'cart', 'sideTable']) assert.equal(lounge.userData[key], undefined);
    const { sofas, chairs, endTable } = lounge.userData;
    const tableGroup = lounge.children.find((part) => part.name === 'Reference small oak end table between chairs');
    assert.ok(tableGroup);
    assert.equal(tableGroup.position.x, (chairs[0].x + chairs[1].x) / 2);
    assert.equal(tableGroup.position.z, (chairs[0].z + chairs[1].z) / 2);
    assert.equal(endTable.w * 12, 16);
    assert.equal(endTable.d * 12, 16);
    assert.equal(endTable.h * 12, 22);
    assert.equal(tableGroup.children.filter((part) => part.name === 'Reference end table oak leg').length, 4);
    const room = context.getGroundFloorDefaultPlan().rooms.find((item) => item.name === 'Living room');
    assert.equal(sofas.length, 1);
    assert.equal(sofas[0].rotation, -Math.PI / 2);
    assert.equal(sofas[0].z, getLivingRoomFeatureLayout().centerZ, 'Main sofa is centered on the fireplace axis');
    for (const [index, sofa] of sofas.entries()) {
      assert.equal(sofa.w * 12, index === 0 ? 90 : 66);
      assert.equal(sofa.d * 12, 39);
    }
    assert.equal(chairs.length, 2);
    for (const chair of chairs) {
      assert.equal(chair.rotation, 0, 'Chairs face into the room from the window wall');
      assert.equal(chair.z, 10.2);
    }
    const envelopes = [...sofas, ...chairs.map((chair) => ({ ...chair, w: 2.5, d: 2.75 })), { ...endTable, x: tableGroup.position.x, z: tableGroup.position.z, rotation: 0 }].map((part) => {
      const w = Math.abs(Math.cos(part.rotation)) * part.w + Math.abs(Math.sin(part.rotation)) * part.d;
      const d = Math.abs(Math.sin(part.rotation)) * part.w + Math.abs(Math.cos(part.rotation)) * part.d;
      return { minX: part.x - w / 2, maxX: part.x + w / 2, minZ: part.z - d / 2, maxZ: part.z + d / 2 };
    });
    for (const bounds of envelopes) {
      assert.ok(bounds.maxX < 13.25, 'Retain the full 36-inch hall strip');
      assert.ok(bounds.minX > 1.38, 'No overlap with closed cabinet fronts');
      assert.ok(bounds.minZ > room.z && bounds.maxZ < room.z + room.d);
    }
    for (let i = 0; i < envelopes.length; i++) for (let j = i + 1; j < envelopes.length; j++) {
      const a = envelopes[i], b = envelopes[j];
      assert.ok(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ, 'Separate furnishings do not overlap');
    }
    assert.ok(Math.abs((envelopes[0].minZ - envelopes[1].maxZ) * 12 - 25.8) < 0.001);
    assert.ok(Math.abs((envelopes[3].minX - envelopes[1].maxX) * 12 - 2.2) < 0.001);
    assert.ok(Math.abs((envelopes[2].minX - envelopes[3].maxX) * 12 - 2.2) < 0.001);
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
