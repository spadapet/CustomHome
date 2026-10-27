'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('piano leaves office as a complete group and backs onto living-side stair enclosure', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  let parent;
  const piano = { position: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: {}, userData: {} };
  const start = source.indexOf('  scene.add(piano);');
  const end = source.indexOf('\n', source.indexOf('  piano.userData.location =', start));
  assert.ok(start >= 0 && end > start);
  const stairOpening = require('../upstairs-layout.js').stairOpening();
  vm.runInNewContext(source.slice(start, end), { piano, scene: { add(object) { parent = object; } }, stairOpening, pianoDepth: 411 / 304.8 });
  assert.equal(parent, piano);
  assert.equal(piano.rotation.y, Math.PI);
  const halfWidth = 1350 / 304.8 / 2;
  assert.equal(piano.position.x, 3.1);
  assert.ok(piano.position.x - halfWidth > 0.2375, 'Console clears west wall and base trim');
  assert.ok(Math.abs(stairOpening.z - piano.position.z - 411 / 304.8 / 2 - 0.4) < 1e-9, 'Rear service gap is 4.8 inches to stair wall');
  assert.ok(piano.position.z + 411 / 304.8 / 2 < 35.1, 'Whole piano is outside office and powder room');
  assert.ok(piano.position.x + 1 < 5.5, 'Bench remains on the west side of sectional return');
  assert.match(piano.userData.location, /Living side of stair enclosure/);
});
