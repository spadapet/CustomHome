'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const roof = require('../floor-plan-roof.js');
const layout = require('../upstairs-layout.js');
const baseline = require('../floor-plan-upstairs.js').getUpstairsDefaultPlan(layout.stairOpening());
const saved = JSON.parse(fs.readFileSync(require.resolve('../upstairs-layout.json'), 'utf8'));
const resolved = layout.resolve(baseline, saved);
const g = require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry();

test('no bonus room is added over the garage; only the measured bedroom edge projects 4.45 inches', () => {
  for (const rect of [...resolved.rooms, ...resolved.floors]) {
    const overlapX = Math.min(rect.x + rect.w, 55.5) - Math.max(rect.x, g.southEast);
    const overlapZ = Math.min(rect.z + rect.d, 49) - Math.max(rect.z, 36.2);
    assert.ok(overlapX <= 1e-7 || overlapZ <= 1e-7, rect.name);
  }
  const south = resolved.walls.find((wall) => wall.name === 'Loft south exterior');
  assert.equal(south.z1, g.serviceSouth);
  assert.equal(south.z2, g.serviceSouth);
  assert.ok(Math.abs((g.southEast - 31.2) * 12 - 4.45) < 1e-7);
});

test('exposed laundry/loft facade closes to the measured bedroom return', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const upper = require('../floor-plan-upstairs.js');
  const segment = upper.getUpstairsExteriorSegments().find(([name]) => name === 'loft south');
  assert.deepEqual(segment.slice(1), [g.southEast, g.serviceSouth, g.east, g.serviceSouth]);
  const host = resolved.walls.find(w => w.name === 'Laundry south');
  assert.equal(host.x1, segment[1]);
  assert.equal(host.x2, g.laundryEast);
  assert.equal(host.z1, segment[2]);
  assert.match(source, /getUpstairsExteriorSegments\(\)/);
});

test('actual clipped garage hip has a subordinate 12.475 ft crown without raising walls or screening upstairs windows', () => {
  const definitions = roof.getConnectedRoofDefinitions();
  const garage = definitions.find((item) => item.id === 'Garage hip');
  const height = (x, z) => Math.min(...garage.planes.map((plane) => roof.heightAt(plane, [x, z])));
  assert.ok(Math.abs(height(43.25, 42.7) - 12.475) < 1e-7);
  for (const x of [31, 55.5]) assert.ok(height(x, 49.2) - 0.16 >= 9);
  assert.ok(Math.abs(garage.planes[0][0] - 0.5) < 1e-7);
  const envelope = roof.buildRoofEnvelope(definitions);
  const faces = envelope.faces.filter((face) => face.roof === garage.id);
  assert.ok(faces.length >= 3);
  for (const face of faces) for (const point of face.polygon) {
    assert.ok(roof.heightAt(face.plane, point) <= 12.475 + 1e-7);
    assert.ok(point[1] >= 35.55 - 1e-7);
  }
  for (const window of resolved.windows.filter(([name]) => /^Loft [12]$/.test(name))) {
    assert.ok(window[2] + window[3] / 2 < garage.bounds[2], 'Loft glazing stays north of the garage roof');
  }
});
