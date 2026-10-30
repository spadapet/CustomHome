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
  const firstFloorOutput = {};
  const secondFloorOutput = {};
  const windowOutput = {};
  const windowInstallations = [
    { openingId: 'joined-bank', units: 1, picture: false, singleHung: true },
    { openingId: 'joined-bank', units: 1, picture: false, singleHung: true },
    { openingId: 'joined-bank', units: 1, picture: false, singleHung: true },
    { openingId: 'upstairs-pair', units: 2, picture: false },
    { openingId: 'garage', units: 1, picture: true }
  ];
  const context = { getLivableFloorArea, groundBaseline: ground, groundLayoutPreview: null, upstairs, windowInstallations,
    document: { getElementById: id => ({
      'window-count': windowOutput, 'livable-area': output,
      'first-floor-area': firstFloorOutput, 'second-floor-area': secondFloorOutput
    })[id] } };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  function updateLivableArea()');
  const end = source.indexOf('  const roomDimensionsInput =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const groundArea = getLivableFloorArea(ground);
  const upstairsArea = getLivableFloorArea({ floors: [...upstairs.plan.floors, upper.arrival] });
  const expected = groundArea + upstairsArea;
  const expectedText = (first, second) => {
    const format = (area) => Math.round(area).toLocaleString('en-US');
    return `Area: ~${format(first + second)} sq ft`;
  };
  const assertFloorOutputs = (first, second) => {
    assert.equal(firstFloorOutput.textContent, `1st: ~${Math.round(first).toLocaleString('en-US')} sq ft`);
    assert.equal(secondFloorOutput.textContent, `2nd: ~${Math.round(second).toLocaleString('en-US')} sq ft`);
    assert.equal(firstFloorOutput.title, output.title);
    assert.equal(secondFloorOutput.title, output.title);
  };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea, upstairsArea));
  assertFloorOutputs(groundArea, upstairsArea);
  assert.equal(windowOutput.textContent, 'Windows: 6');
  assert.match(windowOutput.title, /3 openings containing 6 individual units/);
  assert.match(output.title, new RegExp(`Ground floor: ~${Math.round(groundArea).toLocaleString('en-US')} sq ft`));
  assert.match(output.title, new RegExp(`upstairs: ~${Math.round(upstairsArea).toLocaleString('en-US')} sq ft`));
  assert.match(windowOutput.title, /2 casements, 3 single-hung, 1 fixed pictures/);
  assert.match(windowOutput.title, /Includes hidden windows; excludes door glazing and duplicate exterior representations/);
  assert.match(output.title, /Excludes garage, porch, mechanical space and open stair voids/);
  assert.ok(expected > 3500 && expected < 5000);
  context.groundLayoutPreview = { plan: { floors: [...ground.floors, { x: -10, z: 0, w: 10, d: 10, room: 'Office' }] } };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea + 100, upstairsArea));
  assertFloorOutputs(groundArea + 100, upstairsArea);
  context.groundLayoutPreview = null;
  upstairs.plan = { floors: [...upstairs.plan.floors, { x: -10, z: 0, w: 10, d: 5, room: 'Bedroom' }] };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea, upstairsArea + 50));
  assertFloorOutputs(groundArea, upstairsArea + 50);
  assert.equal(windowOutput.textContent, 'Windows: 6');
  windowInstallations.push({ openingId: 'new-window', units: 2, picture: false });
  context.updateLivableArea();
  assert.equal(windowOutput.textContent, 'Windows: 8');
  assert.match(windowOutput.title, /4 openings containing 8 individual units/);
  assert.match(source, /updateFloorGrid\(\);\s+updateLivableArea\(\);\s+updatePlanDimensions\(\);/);
});
