'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivableFloorArea, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const layout = require('../upstairs-layout.js');

test('livable area uses the union of interior floor surfaces, not room envelopes', () => {
  const floors = [
    { x: 0, z: 0, w: 10, d: 10, room: 'Living room' },
    { x: 5, z: 0, w: 10, d: 10, room: 'Hall' },
    { x: 0, z: 10, w: 2, d: 3, room: 'Closet' },
    ...['Garage', 'Front porch', 'Mechanical (relocated)'].map((room) => ({ x: 30, z: 0, w: 20, d: 20, room }))
  ];
  assert.equal(getLivableFloorArea({ floors }), 156);
  assert.equal(getLivableFloorArea({ floors: [] }), 0);
  assert.throws(() => getLivableFloorArea({ floors: [{ x: 0, z: 0, w: NaN, d: 1 }] }), /invalid floor geometry/);
});

test('both floors use resolved floor geometry and changes recalculate the displayed total', () => {
  const scope = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../floor-plan-upstairs.js'), 'utf8'), scope);
  const ground = getGroundFloorDefaultPlan();
  const upper = scope.getUpstairsDefaultPlan(layout.stairOpening());
  const upstairs = { plan: layout.resolve(upper, layout.empty()), baseline: upper };
  const output = {};
  const context = { getLivableFloorArea, groundBaseline: ground, groundLayoutPreview: null, upstairs, document: { getElementById: () => output } };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  function updateLivableArea()');
  vm.runInNewContext(source.slice(start, source.indexOf('  const roomDimensionsInput =', start)), context);
  const groundArea = getLivableFloorArea(ground);
  const upstairsArea = getLivableFloorArea({ floors: [...upstairs.plan.floors, upper.arrival] });
  const expected = groundArea + upstairsArea;
  const expectedText = (first, second) => {
    const format = (area) => Math.round(area).toLocaleString('en-US');
    return `Livable: ~${format(first + second)} sq ft | First floor: ~${format(first)} sq ft | Second floor: ~${format(second)} sq ft`;
  };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea, upstairsArea));
  assert.match(output.title, /Excludes garage, porch, mechanical space and open stair voids/);
  assert.ok(expected > 3500 && expected < 5000);
  context.groundLayoutPreview = { plan: { floors: [...ground.floors, { x: -10, z: 0, w: 10, d: 10, room: 'Office' }] } };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea + 100, upstairsArea));
  context.groundLayoutPreview = null;
  upstairs.plan = { floors: [...upstairs.plan.floors, { x: -10, z: 0, w: 10, d: 5, room: 'Bedroom' }] };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea, upstairsArea + 50));
  assert.match(source, /updateFloorGrid\(\);\s+updateLivableArea\(\);\s+updatePlanDimensions\(\);/);
});
