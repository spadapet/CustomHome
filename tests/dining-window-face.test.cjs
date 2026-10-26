'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('garden-facing dining window points white trim and inset sill west into the room', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const line = source.split('\n').find((line) => line.includes("windowFrame('Dining garden-facing casements'"));
  let args;
  vm.runInNewContext(line, { scene: {}, windowFrame: (...values) => { args = values; } });
  assert.equal(args[8], 1);
  assert.ok(Math.sin(args[6]) * args[8] < -0.99, 'Interior normal faces west, not east into garden');
  assert.equal(args[3], 6);
  assert.equal(args[4], 5);
  assert.equal(args[5], 3);
});
