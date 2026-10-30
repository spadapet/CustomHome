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
  assert.match(footer, /ANSI-style above-grade gross finished-area estimate/);
  assert.match(footer, /including interior walls/);
});

test('livable area uses the union of interior floor surfaces, not room envelopes', () => {
  const floors = [
    { x: 0, z: 0, w: 10, d: 10, room: 'Living room' },
    { x: 5, z: 0, w: 10, d: 10, room: 'Hall' },
    { x: 0, z: 10, w: 2, d: 3, room: 'Closet' },
    ...['Garage', 'Front porch'].map((room) => ({ x: 30, z: 0, w: 20, d: 20, room }))
  ];
  assert.ok(Math.abs(getLivableFloorArea({ floors }) - 168.8025) < 1e-8, '156 sq ft floor union plus exterior wall bands and corners');
  assert.equal(getLivableFloorArea({ floors: [] }), 0);
  assert.throws(() => getLivableFloorArea({ floors: [{ x: 0, z: 0, w: NaN, d: 1 }] }), /invalid floor geometry/);
});

test('stair footprint is explicitly counted on one floor and unioned with any overlapping surfaces', () => {
  const stairs = { x: 0, z: 0, width: 4, depth: 10 };
  const floors = [{ x: 2, z: 0, w: 4, d: 10, room: 'Hall' }];
  const plan = { floors, stairs };
  const before = JSON.stringify(plan);
  assert.ok(Math.abs(getLivableFloorArea(plan) - 46.5025) < 1e-8);
  assert.ok(Math.abs(getLivableFloorArea(plan, { includeStairs: true }) - 67.4025) < 1e-8, 'Stair/hall overlap counted once before exterior measurement');
  assert.ok(Math.abs(getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }) - 46.5025) < 1e-8);
  assert.equal(JSON.stringify(plan), before, 'Area calculation never changes floor geometry or saved data');
  assert.throws(() => getLivableFloorArea({ floors }, { includeStairs: true }), /without the stair footprint/);
  assert.throws(() => getLivableFloorArea({ floors, stairs: { ...stairs, width: NaN } }, { includeStairs: true }), /invalid floor geometry/);
});

test('gross area includes walls and uses garage-side finish on a shared garage wall', () => {
  const floors = [{ x: 0, z: 0, w: 10, d: 10 }];
  const wall = (x1, z1, x2, z2, thickness = .4, openings = []) => ({ x1, z1, x2, z2, thickness, openings });
  const walls = [wall(0,0,10,0), wall(10,0,10,10), wall(10,10,0,10), wall(0,10,0,0)];
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected} sq ft`);
  close(getLivableFloorArea({ floors, walls }), 10.45 * 10.45);
  const partition = wall(5,0,5,10,.2);
  close(getLivableFloorArea({ floors, walls: [...walls, partition] }), 109.2025);
  close(getLivableFloorArea({ floors, walls: [...walls, { ...partition, openings: [[3,6,0,8]] }] }), 109.2025);
  close(getLivableFloorArea({ floors, walls: [...walls, { ...partition, openings: [[3,6,3,8]] }] }), 109.2025);
  const withGarage = [...floors, { x: 10, z: 0, w: 10, d: 10, room: 'Garage' }];
  close(getLivableFloorArea({ floors: withGarage, walls }), 10.425 * 10.45);
  const tuples = walls.map((w, index) => [`Wall ${index}`, w.x1, w.z1, w.x2, w.z2]);
  close(getLivableFloorArea({ floors: withGarage, walls: tuples }), 10.4 * 10.45);
  const partialGarage = [...floors, { x: 10, z: 0, w: 10, d: 5, room: 'Garage' }];
  close(getLivableFloorArea({ floors: partialGarage, walls: tuples }), 108.94125);
  const steppedThickness = [wall(10,0,10,3,.2), wall(10,3,10,5,.4)];
  close(getLivableFloorArea({ floors: partialGarage, walls: steppedThickness }), 108.749375);
  const plan = { floors, walls: [...walls, partition] }, before = JSON.stringify(plan);
  getLivableFloorArea(plan);
  assert.equal(JSON.stringify(plan), before, 'Measurement never changes wall, floor or saved geometry');
});

test('gross area unions overlaps, includes finished mechanical space and does not fill internal voids', () => {
  const floor = { x: 0, z: 0, w: 10, d: 10 };
  const vertical = { x1: 5, z1: 0, x2: 5, z2: 10, thickness: .4, openings: [] };
  const horizontal = { x1: 0, z1: 5, x2: 10, z2: 5, thickness: .4, openings: [] };
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected} sq ft`);
  close(getLivableFloorArea({ floors: [floor, floor], walls: [vertical, horizontal, vertical] }), 109.2025);
  close(getLivableFloorArea({ floors: [floor, { ...floor, x: 30 }] }), 2 * 109.2025);
  close(getLivableFloorArea({ floors: [{ ...floor, room: 'Mechanical (relocated)' }] }), 109.2025);
  close(getLivableFloorArea({ floors: [{ ...floor, room: 'Garage' }] }), 0);
  close(getLivableFloorArea({ floors: [{ ...floor, room: 'Front porch' }] }), 0);
  const ring = [
    { x: 0, z: 0, w: 10, d: 3 }, { x: 0, z: 7, w: 10, d: 3 },
    { x: 0, z: 3, w: 3, d: 4 }, { x: 7, z: 3, w: 3, d: 4 }
  ];
  close(getLivableFloorArea({ floors: ring }), 109.2025 - 16);
  const stairs = { x: 0, z: 0, width: 10, depth: 10, voids: [{ x: 3, z: 3, w: 4, d: 4 }] };
  close(getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }), 109.2025 - 16);
  stairs.voids.push({ ...stairs.voids[0] });
  close(getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }), 109.2025 - 16);
});

test('invalid wall dimensions and stair voids fail explicitly instead of producing an area estimate', () => {
  const floor = { x: 0, z: 0, w: 10, d: 10 };
  const wall = { x1: 0, z1: 0, x2: 0, z2: 10, thickness: .35, openings: [] };
  for (const edit of [{ thickness: NaN }, { thickness: 0 }, { x1: Infinity }]) {
    assert.throws(() => getLivableFloorArea({ floors: [floor], walls: [{ ...wall, ...edit }] }), /invalid wall geometry/);
  }
  for (const edit of [{ x2: 1 }, { z2: 0 }]) {
    assert.throws(() => getLivableFloorArea({ floors: [floor], walls: [{ ...wall, ...edit }] }), /nonzero axis-aligned walls/);
  }
  const stairs = { x: 0, z: 0, width: 10, depth: 10, voids: [{ x: -1, z: 3, w: 4, d: 4 }] };
  assert.throws(() => getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }), /Stair void must stay inside/);
  stairs.voids[0].x = NaN;
  assert.throws(() => getLivableFloorArea({ floors: [], stairs }, { includeStairs: true }), /invalid floor geometry/);
});

test('current house uses exterior faces, includes descending stairs on both floors and excludes only actual stair gaps', () => {
  const ground = getGroundFloorDefaultPlan();
  const upper = require('../floor-plan-upstairs.js').getUpstairsDefaultPlan(layout.stairOpening());
  const upstairs = { ...layout.resolve(upper, layout.empty()), floors: [...upper.floors, upper.arrival], stairs: upper.stairs };
  const close = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected} sq ft`);
  const stairArea = ground.stairs.width * ground.stairs.depth;
  const first = getLivableFloorArea(ground, { includeStairs: true });
  const second = getLivableFloorArea(upstairs, { includeStairs: true });
  close(stairArea, 76.94583333333333);
  const gap = ground.stairs.voids.reduce((sum, rect) => sum + rect.w * rect.d, 0);
  close(gap, 1.4583333333333335);
  close(first - getLivableFloorArea(ground), stairArea - gap, 'First-floor stairs descend to basement');
  close(second - getLivableFloorArea(upstairs), stairArea - gap, 'Second-floor stairs descend to first floor');
  close(first, 1966.4427083333333);
  close(second, 2312.5166666666666);
  close(first + second, 4278.959375);
  close((upper.rooms.find(r => r.name === 'Bedroom 4 closet').w) * .5, 2.925, 'Closet 4 inset removes only the half-foot strip');
  for (const plan of [ground, upstairs]) {
    const before = JSON.stringify(plan);
    getLivableFloorArea(plan, { includeStairs: true });
    assert.equal(JSON.stringify(plan), before, 'Gross measurement does not modify the layout');
  }
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
  const upstairsArea = getLivableFloorArea({ ...upstairs.plan, stairs: upper.stairs, floors: [...upstairs.plan.floors, upper.arrival] }, { includeStairs: true });
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
  assert.match(output.title, /Excludes garage, open porch and basement/);
  assert.match(output.title, /first-floor basement stairs and second-floor stairs included; open stair gaps excluded/);
  assert.match(output.title, /ANSI-style above-grade gross finished-area estimate to modeled exterior finished faces, including interior walls/);
  assert.match(output.title, /Shared garage walls measured to the garage-side finish/);
  assert.match(output.title, /including the mechanical closet, are finished and conditioned/);
  assert.match(output.title, /Not a certified appraisal/);
  assert.equal(output.textContent, 'Area: ~4,279 sq ft');
  assertFloorOutputs(1966.4427083333333, 2312.5166666666666);
  context.groundLayoutPreview = { plan: layout.resolve(ground, layout.empty()) };
  context.updateLivableArea();
  assertFloorOutputs(groundArea, upstairsArea);
  context.groundLayoutPreview = { plan: { ...ground, floors: [...ground.floors, { x: -20, z: 0, w: 10, d: 10, room: 'Office' }] } };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea + 109.2025, upstairsArea));
  assertFloorOutputs(groundArea + 109.2025, upstairsArea);
  context.groundLayoutPreview = null;
  upstairs.plan = { ...upstairs.plan, floors: [...upstairs.plan.floors, { x: -20, z: 0, w: 10, d: 5, room: 'Bedroom' }] };
  context.updateLivableArea();
  assert.equal(output.textContent, expectedText(groundArea, upstairsArea + 56.9525));
  assertFloorOutputs(groundArea, upstairsArea + 56.9525);
  assert.equal(windowOutput.textContent, 'Windows: 6');
  windowInstallations.push({ openingId: 'new-window', units: 2, picture: false });
  context.updateLivableArea();
  assert.equal(windowOutput.textContent, 'Windows: 8');
  assert.match(windowOutput.title, /4 openings containing 8 individual units/);
  context.groundBaseline = {
    floors: [{ x: 0, z: 0, w: 10, d: 10 }],
    stairs: { x: 0, z: 0, width: 0, depth: 0 },
    walls: [{ x1: 0, z1: 5, x2: 10, z2: 5, thickness: .35 }]
  };
  context.updateLivableArea();
  assertFloorOutputs(109.2025, upstairsArea + 56.9525);
  context.groundBaseline.walls[0].thickness = .8;
  context.updateLivableArea();
  assertFloorOutputs(109.2025, upstairsArea + 56.9525);
  assert.match(source, /updateFloorGrid\(\);\s+updateLivableArea\(\);\s+updatePlanDimensions\(\);/);
});
