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

test('resolved upstairs has no room or slab over the front garage', () => {
  for (const rect of [...resolved.rooms, ...resolved.floors]) {
    const overlapX = Math.min(rect.x + rect.w, 55.5) - Math.max(rect.x, 31.2);
    const overlapZ = Math.min(rect.z + rect.d, 49) - Math.max(rect.z, 36.2);
    assert.ok(overlapX <= 1e-7 || overlapZ <= 1e-7, rect.name);
  }
  const south = resolved.walls.find((wall) => wall.name === 'Loft south exterior');
  assert.equal(south.z1, 36.2);
  assert.equal(south.z2, 36.2);
});

test('exposed storage south facade closes the actual resolved solid wall to the bedroom return', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const line = source.split('\n').find((line) => line.includes("wall('upper storage south'"));
  let actual;
  vm.runInNewContext(line, { eaves: 19, wall(...args) { actual = args; } });
  const host = resolved.walls.find((wall) => wall.name === 'Storage south');
  assert.equal(actual[1], 31);
  assert.equal(actual[2], host.z1);
  assert.equal(actual[3], host.x2);
  assert.equal(actual[4], host.z2);
  assert.equal(actual[5], 9);
  assert.equal(actual[6], 19);
  assert.deepEqual(host.openings, []);
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
  for (const window of resolved.windows.filter(([name]) => /^Loft /.test(name))) {
    assert.ok(window[2] + window[3] / 2 < garage.bounds[2], 'Loft glazing stays north of the garage roof');
  }
});
