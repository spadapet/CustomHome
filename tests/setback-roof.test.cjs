'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const roof = require('../floor-plan-roof.js');

test('lower east and rear wall setbacks have continuous roof coverage instead of open slots to the lawn', () => {
  const plan = roof.buildRoofEnvelope(roof.getSetbackRoofDefinitions());
  for (const [left, right, rear, front] of [[26.875, 55.5, 7, 9.775], [54.225, 55.5, 9.775, 15.625], [52.225, 55.5, 15.625, 36.2]]) {
    for (let ix = 1; ix < 20; ix++) for (let iz = 1; iz < 20; iz++) {
      const point = [left + (right - left) * ix / 20, rear + (front - rear) * iz / 20];
      const faces = plan.faces.filter(face => roof.contains(face.polygon, point));
      assert.equal(faces.length, 1, `Unique roof coverage at ${point}`);
      const top = roof.heightAt(faces[0].plane, point);
      assert.ok(top - 0.16 > 9, 'Roof underside stays above the lower wall and its window heads');
      assert.ok(top < 10, 'Closure stays within the floor band below upstairs windows');
      assert.equal(faces[0].plane[0], -1 / 48);
    }
  }
});

test('setback roofs are continuous across step boundaries and actually rendered with closed perimeter edges', () => {
  const definitions = roof.getSetbackRoofDefinitions();
  for (let i = 1; i < definitions.length; i++) {
    const previous = definitions[i - 1], current = definitions[i];
    assert.equal(previous.bounds[3], current.bounds[2]);
    const point = [55, current.bounds[2]];
    assert.equal(roof.heightAt(previous.planes[0], point), roof.heightAt(current.planes[0], point));
  }
  assert.deepEqual(definitions.map(d => d.bounds[0]), [25.925, 54.225, 52.225],
    'Roofing stops at outside masonry, not 5.4 inches inside the walls');
  assert.equal(definitions[0].bounds[3], 10 - 0.225, 'Rear abutment meets the north wall face');
});

test('dining and garage roof intersections are clipped to a single lower envelope', () => {
  const plan = roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  for (const [left, right, rear, front] of [[25.925, 27.525, 6.7, 7.5], [52.225, 55.8, 35.55, 36.2]]) {
    for (let ix = 1; ix < 30; ix++) for (let iz = 1; iz < 30; iz++) {
      const p = [left + (right - left) * ix / 30, rear + (front - rear) * iz / 30];
      const candidates = plan.patches.filter(f => roof.contains(f.polygon, p));
      const visible = plan.faces.filter(f => roof.contains(f.polygon, p));
      assert.equal(visible.length, 1, `No crossing/duplicate skins at ${p}`);
      assert.ok(Math.abs(roof.heightAt(visible[0].plane, p) -
        Math.max(...candidates.map(f => roof.heightAt(f.plane, p)))) < 1e-6);
    }
  }
  assert.ok(plan.joins.some(j => j.roofs.includes('Dining rear projection') && j.roofs.some(r => r.includes('setback'))));
  assert.ok(plan.joins.some(j => j.roofs.includes('Garage hip') && j.roofs.some(r => r.includes('setback'))));
});

test('lower wall closures follow roof underside across both slate/metal transitions', () => {
  const plan = roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  for (const [a, b] of [[[26.875, 7], [55.5, 7]], [[55.5, 7], [55.5, 36.2]]]) {
    const segments = roof.wallHeadSegments(plan, a, b, 9);
    assert.ok(segments.length > 1);
    for (const segment of segments) for (const p of [segment.start, segment.end]) {
      const tops = plan.faces.filter(f => roof.contains(f.polygon, [p[0], p[2]]))
        .map(f => roof.heightAt(f.plane, [p[0], p[2]]) - 0.16);
      assert.ok(tops.some(y => Math.abs(y - p[1]) < 1e-5), 'Closure reaches actual underside');
      assert.equal(segment.bottom, 9);
    }
  }
});

test('projection notch clips actual triangles with interpolated roof heights and UVs', () => {
  const triangles = [[[0, 0, 0, 0, 0], [4, 0, 0, 1, 0], [4, 4, 4, 1, 1]],
    [[0, 0, 0, 0, 0], [4, 4, 4, 1, 1], [0, 4, 4, 0, 1]]];
  const clipped = roof.trianglesOutsideRectangle(triangles, [2, 5, 2, 5]);
  let area = 0;
  for (const triangle of clipped) {
    area += Math.abs(roof.signedArea(triangle.map(p => [p[0], p[2]])));
    const center = triangle[0].map((_, i) => triangle.reduce((sum, p) => sum + p[i], 0) / 3);
    assert.ok(center[0] <= 2 || center[2] <= 2, 'No roof constituent remains inside upper room');
    for (const p of triangle) {
      assert.equal(p[1], p[2], 'Slope is retained at new cut vertices');
      assert.equal(p[3], p[0] / 4);
      assert.equal(p[4], p[2] / 4);
    }
  }
  assert.equal(area, 12, 'Only the four-square-foot overlapping roof portion is removed');
});
