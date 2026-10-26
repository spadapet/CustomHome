'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('piano moves as a complete group to office with static desk and open-leaf separation', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  let parent;
  const piano = { position: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: {}, userData: {} };
  const start = source.indexOf('  rest.add(piano);');
  const end = source.indexOf('\n', source.indexOf('  piano.userData.location =', start));
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    piano, rest: { add(object) { parent = object; } }, officeNorthZ: 41, pianoDepth: 411 / 304.8
  });
  assert.equal(parent, piano);
  assert.equal(piano.rotation.y, 0);
  const halfWidth = 1350 / 304.8 / 2;
  assert.ok(piano.position.x - halfWidth > 6.3, 'Piano clears north desktop');
  assert.ok(piano.position.x + halfWidth < 12.2 - 0.175);
  assert.ok(Math.abs(piano.position.z - 411 / 304.8 / 2 - 41.4) < 1e-9);
  const benchRight = piano.position.x + 1;
  assert.ok(12.2 - 29.75 / 12 - benchRight > 0.1, 'Bench clears open French leaf tip');
  const benchRear = piano.position.z + 1.3 + 0.5;
  assert.ok(benchRear < 50.45, 'Bench stays clear of south desk');
});
