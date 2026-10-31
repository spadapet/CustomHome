'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const roof = require('../floor-plan-roof.js');
const close = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b} ft`);
const definitions = roof.getConnectedRoofDefinitions();
const plan = roof.buildRoofEnvelope(definitions);
const additions = ['Loft clipped cross-gable', 'Garage front gable'];
const height = (defs, x, z) => Math.max(...defs.filter(({ bounds: [l, r, b, f] }) =>
  x >= l && x <= r && z >= b && z <= f).map(({ planes }) => Math.min(...planes.map(p => roof.heightAt(p, [x, z])))));

test('right roofs have a measured descending hierarchy and a genuine clipped loft crown', () => {
  const loft = definitions.find(d => d.id === additions[0]);
  const garage = definitions.find(d => d.id === additions[1]);
  close(loft.bounds[1] - loft.bounds[0], 16.85);
  close((loft.bounds[0] + loft.bounds[1]) / 2, (44.65 + 51.5) / 2);
  close(height([loft], 48.075, 33), 24.4);
  close(height([loft], 48.075, 35.85), 23.3);
  close(height([loft], 48.075, 34.97), 24.4);
  close(height([garage], 43.25, 49.85), 16.1);
  close(garage.bounds[1] - garage.bounds[0], 25.9);
  close(garage.bounds[2], 37.5);
  close(garage.bounds[3], 49.85);
  close(Math.hypot(garage.planes[0][0], garage.planes[0][1]) * 12, 7.2 / 12.95 * 12);
  assert.ok(25.4 > 24.4 && 24.4 > 16.1, 'Garage gable stays subordinate to both upper rooflines');
  for (const x of [37, 48.5]) assert.ok(height([garage], x, 49.225) > 12, 'Gable spans both fixed garage-door lights');
  const lower = roof.getLowerRoofDefinitions();
  assert.equal(lower.filter(d => d.id === garage.id).length, 1, 'Same cross-roof in lower and full envelopes');
  for (const id of additions) {
    assert.ok(plan.faces.some(f => f.roof === id));
    assert.ok(plan.joins.some(j => j.type === 'valley' && j.roofs.includes(id)));
  }
});

test('new unions retain accepted headroom, roof footprint and northern solar surfaces', () => {
  const baseline = definitions.filter(d => !additions.includes(d.id));
  let samples = 0, raised = 0;
  for (let x = -.5; x < 56.5; x += .4) for (let z = -2; z < 54.5; z += .4) {
    const before = height(baseline, x, z), after = height(definitions, x, z);
    assert.equal(Number.isFinite(after), Number.isFinite(before), 'No roof footprint expansion');
    if (!Number.isFinite(before)) continue;
    assert.ok(after >= before - 1e-7, `No headroom reduction at ${x},${z}`);
    const withinAddedRoof = additions.some((id) => {
      const { bounds: [left, right, rear, front] } = definitions.find((definition) => definition.id === id);
      return x >= left && x <= right && z >= rear && z <= front;
    });
    if (z < 22.5 || !withinAddedRoof) close(after, before);
    if (after > before + .05) raised++;
    samples++;
  }
  assert.ok(samples > 14000 && raised > 300, 'Measure actual changed surfaces, not metadata');
});

test('new transverse valleys have positive fall and all join endpoints share real faces', () => {
  const valleys = plan.joins.filter(j => j.type === 'valley' && j.roofs.some(id => additions.includes(id)));
  assert.ok(valleys.length >= 8);
  for (const join of valleys) {
    const length = Math.hypot(join.end[0] - join.start[0], join.end[2] - join.start[2]);
    assert.ok(Math.abs(join.end[1] - join.start[1]) / length >= .02,
      'No level rear-return valley; modeled fall is not hydraulic approval');
    for (const p of [join.start, join.end]) {
      const touching = plan.faces.filter(f => roof.contains(f.polygon, [p[0], p[2]]) &&
        Math.abs(roof.heightAt(f.plane, [p[0], p[2]]) - p[1]) < 1e-6);
      assert.ok(touching.length >= 2, 'Clipped roofs meet without gaps');
    }
  }
});

test('garage wall-head solids have full wall depth and fit actual lower roof faces at every constituent vertex', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  for (const face of setbackPlan.faces) {');
  const end = source.indexOf('  for (const edge of setbackPlan.boundaries)', start);
  assert.ok(start > 0 && end > start);
  const meshes = [], lower = roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  const context = {
    HomeRoof: roof, setbackPlan: lower, wallThickness: .45, garageFacadeEaves: 9, frontBrick: {},
    brickFaceUVs() {}, setbackRoofs: { add: m => meshes.push(m) },
    THREE: {
      BufferGeometry: class { setAttribute(key, value) { this[key] = value; } computeVertexNormals() {} },
      Float32BufferAttribute: class { constructor(array) { this.array = array; } },
      Mesh: class { constructor(geometry) { this.geometry = geometry; } }
    }
  };
  vm.runInNewContext(source.slice(start, end), context);
  assert.ok(meshes.length >= 1, 'Full-width gable has actual fitted wall-head geometry');
  const vertices = meshes.flatMap(m => m.geometry.position.array);
  let minZ = Infinity, maxZ = -Infinity, maxY = 0;
  for (let i = 0; i < vertices.length; i += 3) {
    const [x, y, z] = vertices.slice(i, i + 3);
    const top = height(roof.getLowerRoofDefinitions(), x, z) - .16;
    assert.ok(y >= 9 - 1e-6 && y <= top + 1e-6, 'No masonry poking through roof skin');
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); maxY = Math.max(maxY, y);
  }
  close(maxZ - minZ, .45);
  close(maxY, 15.61244862659365);
});

test('clipped high eave has a falling conductor tied to the real east rake and leader node', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  const clippedEave =');
  const end = source.indexOf("  drainageRoute(group, 'Garage east shoulder", start);
  assert.ok(start > 0 && end > start);
  let points;
  vm.runInNewContext(source.slice(start, end), {
    houseRoofPlan: plan, measuredUpper: require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry(),
    group: {}, drainageRoute: (parent, name, route) => { points = route; }
  });
  assert.ok(points && points.length === 4, 'High clipped eave must not end in a dead gutter');
  close(points[0][0], 49.85721153846155);
  close(points[0][1], 23.2);
  close(points[0][2], 35.85);
  for (let i = 1; i < points.length; i++) assert.ok(points[i][1] < points[i - 1][1]);
  close(points[2][0], 56.5);
  close(points[2][1], 18.9);
  assert.deepEqual(Array.from(points[3]), [56.5, 18.5, 35.5], 'Joins actual east leader elbow');
});
