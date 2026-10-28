'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const roof = require('../floor-plan-roof.js');

test('former rear and east setback strips are actual measured upper floors, not low roofs through rooms', () => {
  const upper = require('../floor-plan-upstairs.js');
  const plan = upper.getUpstairsDefaultPlan(require('../upstairs-layout.js').stairOpening());
  for (const [left, right, rear, front] of [[26.875, 55.5, 7, 9.775], [54.225, 55.5, 9.775, 15.625], [52.225, 55.5, 15.625, 35.1]]) {
    for (let ix = 1; ix < 20; ix++) for (let iz = 1; iz < 20; iz++) {
      const point = [left + (right - left) * ix / 20, rear + (front - rear) * iz / 20];
      const floors = plan.floors.filter(f => point[0] > f.x && point[0] < f.x + f.w && point[1] > f.z && point[1] < f.z + f.d);
      assert.equal(floors.length, 1, `Unique upper floor at ${point}`);
      for (const { bounds: [l, r, b, t] } of roof.getSetbackRoofDefinitions()) {
        assert.ok(point[0] <= l || point[0] >= r || point[1] <= b || point[1] >= t, 'No lower skin passes through the measured upper rooms');
      }
    }
  }
});

test('only the narrow loft-to-garage setback remains, bounded by actual masonry faces', () => {
  const definitions = roof.getSetbackRoofDefinitions();
  const g = require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry();
  assert.equal(definitions.length, 1);
  assert.deepEqual(definitions[0].bounds, [g.southEast + .225, 55.8, g.serviceSouth + .225, 36.2]);
  assert.ok(definitions[0].planes[0][0] < 0 && definitions[0].planes[0][1] < 0, 'Falls east and toward southern leader, not the removed rear collector');
  for (const [x, z] of [[g.southEast + .225, 35.325], [55.8, 36.2]]) {
    const top = roof.heightAt(definitions[0].planes[0], [x, z]);
    assert.ok(top - .16 > 9 && top < 10, 'Allowance above lower wall, below upper floor datum');
  }
});

test('dining and garage roof intersections are clipped to a single lower envelope', () => {
  const plan = roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  for (const [left, right, rear, front] of [[52.225, 55.8, 35.55, 36.2]]) {
    for (let ix = 1; ix < 30; ix++) for (let iz = 1; iz < 30; iz++) {
      const p = [left + (right - left) * ix / 30, rear + (front - rear) * iz / 30];
      const candidates = plan.patches.filter(f => roof.contains(f.polygon, p));
      const visible = plan.faces.filter(f => roof.contains(f.polygon, p));
      assert.equal(visible.length, 1, `No crossing/duplicate skins at ${p}`);
      assert.ok(Math.abs(roof.heightAt(visible[0].plane, p) -
        Math.max(...candidates.map(f => roof.heightAt(f.plane, p)))) < 1e-6);
    }
  }
  assert.ok(plan.joins.some(j => j.roofs.includes('Garage hip') && j.roofs.some(r => r.includes('setback'))));
});

test('remaining lower east wall closure follows the actual transition underside', () => {
  const plan = roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  for (const [a, b] of [[[55.5, 35.325], [55.5, 36.2]]]) {
    const segments = roof.wallHeadSegments(plan, a, b, 9);
    assert.ok(segments.length >= 1);
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
