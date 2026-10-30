'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivableFloorArea, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const layout = require('../upstairs-layout.js');

test('viewer footer retains its area outputs and required reset and refresh controls', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  const footer = html.match(/<div class="model-footer">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(footer, 'Existing footer markup is present');
  for (const [tag, id] of [['output', 'livable-area'], ['output', 'window-count'], ['button', 'refresh-model'], ['button', 'reset-view']]) {
    assert.match(footer, new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/${tag}>`));
    assert.equal((html.match(new RegExp(`\\bid="${id}"`, 'g')) ?? []).length, 1, `${id} is unique`);
  }
  assert.match(footer, /Stairs count once on the first floor/);
});

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

test('stair footprint is explicitly counted on one floor and unioned with any overlapping surfaces', () => {
  const stairs = { x: 0, z: 0, width: 4, depth: 10 };
  const floors = [{ x: 2, z: 0, w: 4, d: 10, room: 'Hall' }];
  const plan = { floors, stairs };
  const before = JSON.stringify(plan);
  assert.equal(getLivableFloorArea(plan), 40, 'Upper floor does not automatically include its stair opening');
  assert.equal(getLivableFloorArea(plan, { includeStairs: true }), 60, 'Stair/hall overlap counted once');
  assert.equal(getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }), 40);
  assert.equal(JSON.stringify(plan), before, 'Area calculation never changes floor geometry or saved data');
  assert.throws(() => getLivableFloorArea({ floors }, { includeStairs: true }), /without the stair footprint/);
  assert.throws(() => getLivableFloorArea({ floors, stairs: { ...stairs, width: NaN } }, { includeStairs: true }), /invalid floor geometry/);
});

test('current house counts stairs once downstairs and excludes garage, porch and mechanical floor surfaces', () => {
  const ground = getGroundFloorDefaultPlan();
  const upper = require('../floor-plan-upstairs.js').getUpstairsDefaultPlan(layout.stairOpening());
  const upstairs = { floors: [...upper.floors, upper.arrival], stairs: upper.stairs };
  const close = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected} sq ft`);
  const stairArea = ground.stairs.width * ground.stairs.depth;
  const first = getLivableFloorArea(ground, { includeStairs: true });
  const second = getLivableFloorArea(upstairs);
  close(stairArea, 76.94583333333333);
  close(first - getLivableFloorArea(ground), stairArea, 'Stair opening previously absent downstairs');
  close(first, 1920.9791666666667);
  close(second, 2154.5041666666666);
  close(first + second, 4075.4833333333333);
  close((upper.rooms.find(r => r.name === 'Bedroom 4 closet').w) * .5, 2.925, 'Closet 4 inset removes only the half-foot strip');
  for (const plan of [ground, upstairs]) {
    const insideOnly = { ...plan, floors: plan.floors.filter(f => !/^(Garage|Front porch|Mechanical)/.test(f.room ?? f.name ?? '')) };
    close(getLivableFloorArea(plan), getLivableFloorArea(insideOnly));
  }
  close(getLivableFloorArea({ ...ground, floors: ground.floors.filter(f => f.room !== 'Garage' && f.room !== 'Front porch') }, { includeStairs: true }), first);
  close(getLivableFloorArea(upstairs, { includeStairs: true }) - second, stairArea, 'Adding upstairs opening would incorrectly count stairs twice');
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
  const groundArea = getLivableFloorArea(ground, { includeStairs: true });
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
  assert.match(output.title, /Excludes garage, porch and mechanical space/);
  assert.match(output.title, /Stair footprint counted once on the first floor; upstairs arrival landing included, open stair void excluded/);
  assert.equal(output.textContent, 'Area: ~4,075 sq ft');
  assertFloorOutputs(1920.9791666666667, 2154.5041666666666);
  context.groundLayoutPreview = { plan: { ...ground, floors: [...ground.floors, { x: -10, z: 0, w: 10, d: 10, room: 'Office' }] } };
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
