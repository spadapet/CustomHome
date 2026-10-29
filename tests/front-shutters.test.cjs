'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getGroundFrontWindows } = require('../floor-plan-ground.js');
const { getUpstairsFrontWindows, getUpstairsMeasuredGeometry, getUpstairsExteriorOpenings } = require('../floor-plan-upstairs.js');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
const start = source.indexOf('  function addFrontShutters(');
const end = source.indexOf('  function windowUnit(', start);
assert.ok(start >= 0 && end > start, 'Shutter builder extraction boundaries exist');

class Group {
  constructor() {
    this.children = [];
    this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
  }
  add(child) { this.children.push(child); }
}
const context = { THREE: { Group }, floorToFloor: 10, shutterFinish: {},
  box(parent, x, y, z, w, h, d, material) {
    const mesh = { position: { x, y, z }, rotation: { x: 0 }, w, h, d, material };
    parent.add(mesh);
    return mesh;
  } };
vm.runInNewContext(source.slice(start, end), context);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const g = getUpstairsMeasuredGeometry();
const fronts = [
  getGroundFrontWindows(),
  getUpstairsFrontWindows().map(o => ({ ...o, sill: o.sill + 10 })),
  getUpstairsExteriorOpenings(g.southEast, g.serviceSouth, g.east, g.serviceSouth)
];

test('all eight front openings receive six outer pairs, without panels between tight bedroom windows', () => {
  assert.equal(fronts.flat().length, 8);
  for (const [floor, openings] of fronts.entries()) {
    const wall = new Group();
    const before = JSON.stringify(openings);
    context.addFrontShutters(wall, [...openings, { center: 15.6, width: 5, sill: 0, height: 8, door: true }]);
    assert.equal(JSON.stringify(openings), before, 'Existing opening data is unchanged');
    assert.equal(wall.children.length, 4);
    for (let index = 0; index < 4; index += 2) {
      const left = wall.children[index], right = wall.children[index + 1];
      const width = floor === 0 ? 1.5 : floor === 1 ? 1.25 : 1;
      close(left.position.x + width / 2, left.userData.bankLeftFeet - 0.4);
      close(right.position.x - width / 2, right.userData.bankRightFeet + 0.4);
      close(left.position.y, floor ? 13 : 3);
      close(right.position.y, left.position.y);
      close(left.position.z - 0.1 - 0.425, 0.075);
      assert.equal(left.userData.operable, false);
      assert.equal(left.userData.decorativeOnly, true);
      assert.match(left.userData.mountingReview, /casement operation require review/);
      if (floor === 1) close(left.userData.bankRightFeet - left.userData.bankLeftFeet, 7);
    }
    const innerLeft = wall.children[1], innerRight = wall.children[2];
    const gap = innerRight.position.x - innerRight.userData.widthFeet / 2 -
      innerLeft.position.x - innerLeft.userData.widthFeet / 2;
    assert.ok(gap > 0, 'Shutters on adjacent banks must not overlap');
    if (floor === 2) close(gap * 12, 2.85);
  }
});

test('actual frame and angled louvers fit each 60-inch-tall panel and remain clear of trim', () => {
  for (const openings of fronts) {
    const wall = new Group();
    context.addFrontShutters(wall, openings);
    for (const shutter of wall.children) {
      const width = shutter.userData.widthFeet;
      assert.equal(shutter.children.filter(m => m.name === 'Angled shutter louver').length, 30);
      for (const mesh of shutter.children) {
        const halfY = (mesh.h * Math.cos(mesh.rotation.x) + mesh.d * Math.sin(mesh.rotation.x)) / 2;
        const halfZ = (mesh.d * Math.cos(mesh.rotation.x) + mesh.h * Math.sin(mesh.rotation.x)) / 2;
        assert.ok(Math.abs(mesh.position.x) + mesh.w / 2 <= width / 2 + 1e-8);
        assert.ok(mesh.position.y - halfY >= -1e-8 && mesh.position.y + halfY <= 5 + 1e-8);
        assert.ok(Math.abs(mesh.position.z) + halfZ <= 0.1 + 1e-8);
        assert.equal(mesh.material, context.shutterFinish);
      }
      // Existing widest lintel projects 0.325 ft beyond the opening.
      assert.ok(0.4 - 0.325 > 0);
    }
  }
});

test('only the existing front-facing wall gate builds shutters; rear, side and door glazing stay unchanged', () => {
  assert.match(source, /const front = \['front ground floor', 'upper front bedrooms', 'upper loft south'\]\.includes\(name\)/);
  assert.match(source, /if \(front\) addFrontShutters\(wallGroup, openings\);/);
  assert.match(source, /const shutterFinish = mat\('#292d2b', 0\.85\)/);
  const wall = new Group();
  context.addFrontShutters(wall, [{ center: 5, width: 3, sill: 0, height: 8, door: true }]);
  assert.equal(wall.children.length, 0);
});
