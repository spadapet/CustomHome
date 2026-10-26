'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('decorative sconces default to wall-backed ivory half-oval shades with bounded projection', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  assert.match(source, /function wallSconce\(parent, x, z, rotation, fabricShade = true\)/);
  const positions = [];
  const start = source.indexOf('      const shadePositions =');
  const end = source.indexOf('      const shadeGeometry =', start);
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.points = shadePositions;', positions);
  const points = positions.points;
  const xs = points.filter((_, index) => index % 3 === 0);
  const zs = points.filter((_, index) => index % 3 === 2);
  assert.ok(Math.abs(Math.min(...xs) - 0.01) < 1e-9);
  assert.ok(Math.abs(Math.max(...xs) - 4 / 12) < 1e-9);
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 7.9 / 12) < 1e-9);
  assert.match(source, /color: '#eee4ce'.*side: THREE.DoubleSide/);
});
