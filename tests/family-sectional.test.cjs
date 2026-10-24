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

  test('photo-inspired L fits five full cushions, square table and one accent chair without losing earlier studies', () => {
    class Group {
      constructor() { this.children = []; this.userData = {}; this.rotation = {}; }
      add(child) { this.children.push(child); }
    }
    const scene = new Group();
    const context = {
      THREE: { Group, MeshStandardMaterial: class {} }, scene, walnut: {},
      livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(), livingWeaveTexture() {},
      box(parent, x, y, z, w, h, d) {
        const part = new Group();
        Object.assign(part, { x, y, z, w, h, d });
        parent.add(part);
        return part;
      }
    };
    const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('  const referenceLounge ='), source.indexOf('  const referenceRugCanvas =')), context);
    const lounge = scene.children[0];
    const sectional = lounge.children[0];
    assert.equal(sectional.userData.planningSeats, 5);
    assert.equal(sectional.userData.cornerCounted, false);
    assert.equal(sectional.userData.comfortVerified, false);
    assert.equal(lounge.userData.guestChairs, 1);
    const seats = sectional.children.filter((part) => part.name === 'Reference sectional full seat cushion');
    assert.equal(seats.length, 5);
    assert.equal(sectional.children.filter((part) => part.name === 'Reference sectional uncounted corner cushion').length, 1);
    seats.forEach((seat, index) => {
      assert.ok((index < 3 ? seat.d : seat.w) * 12 >= 25.5, 'Counted seat widths are at least 25.5 inches after seams');
      assert.ok((index < 3 ? seat.w : seat.d) * 12 >= 30, 'Counted seat depths are at least 30 inches');
    });
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
      assert.ok(Math.abs(seats[i].x - seats[j].x) >= (seats[i].w + seats[j].w) / 2 ||
        Math.abs(seats[i].z - seats[j].z) >= (seats[i].d + seats[j].d) / 2, 'Counted cushions remain separate');
    }
    const { main, return: side, table, rug, chair } = lounge.userData;
    const maxX = main.x + main.w / 2;
    const minX = side.x - side.w / 2;
    assert.ok(Math.abs((maxX - minX) * 12 - 100) < 0.001);
    assert.equal(main.d * 12, 132);
    assert.ok(Math.abs((main.x - main.w / 2 - table.x - table.w / 2) * 12 - 18) < 0.001);
    assert.ok(Math.abs((side.z - side.d / 2 - table.z - table.d / 2) * 12 - 18) < 0.001);
    assert.ok((minX - 1.38) * 12 >= 35.2, 'Return stays over 35 inches from the closed cabinet front');
    assert.ok((26.775 - main.z - main.d / 2) * 12 >= 37.4, 'Retain the stair-side end gap');
    assert.ok(maxX < 13.25, 'Keep the main hall strip clear');
    assert.equal(table.w * 12, 38);
    assert.equal(table.d * 12, 38);
    assert.equal(rug.w, 9);
    assert.equal(rug.d, 12);
    assert.equal(chair.widthInches, 30);
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
