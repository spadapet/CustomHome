'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const roof = require('../assets/js/floor-plan-roof.js');
const layout = roof.getRoofDrainageLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b} feet`);

test('adopted gutters collect only level eaves and retain independent high and low roof drainage', () =>
{
  assert.equal(layout.gutters.length, 10);
  assert.equal(layout.routes.length, 11);
  assert.equal(new Set(layout.routes.map(route => route.id)).size, 11);
  const definitions = [...roof.getConnectedRoofDefinitions(), ...roof.getPorchRoofDefinitions()];
  for (const gutter of layout.gutters)
  {
    const definition = definitions.find(item => item.id === gutter.roof);
    assert.ok(definition, gutter.id);
    close(gutter.start[1], gutter.end[1]);
    assert.ok(Math.hypot(gutter.end[0] - gutter.start[0], gutter.end[2] - gutter.start[2]) > 1);
    for (const point of [gutter.start, gutter.end])
      close(point[1], Math.min(...definition.planes.map(plane => roof.heightAt(plane, [point[0], point[2]]))));
  }
  assert.equal(layout.gutters.filter(run => run.roof === 'Dining rear projection').length, 2);
  assert.equal(layout.gutters.filter(run => run.id === 'porch').length, 1);
  assert.match(layout.unresolved.join(' '), /Dining west abutment/);
});

test('every modeled leader inlet sits inside its real open gutter rather than below or beside it', () =>
{
  const served = new Set();
  for (const route of layout.routes)
  {
    if (route.collectorId)
    {
      const collector = layout.collectors.find(item => item.id === route.collectorId);
      assert.deepEqual(route.points[0], collector.outlet);
      close(collector.bottomFeet - route.points[0][1], .2);
      continue;
    }
    const gutter = layout.gutters.find(run => run.id === route.gutterId);
    assert.ok(gutter, route.id);
    served.add(gutter.id);
    const [x, y, z] = route.points[0];
    const dx = gutter.end[0] - gutter.start[0], dz = gutter.end[2] - gutter.start[2], length = Math.hypot(dx, dz);
    const along = ((x - gutter.start[0]) * dx + (z - gutter.start[2]) * dz) / length;
    const outward = ((x - gutter.start[0]) * dz - (z - gutter.start[2]) * dx) / length;
    assert.ok(along > .125 && along < length - .125, `${route.id} clears end caps`);
    close(outward, 5 / 24);
    close(y - (gutter.start[1] - .08 - 3.5 / 12 - roof.gutterDropAt(gutter, route.points[0])), .025);
    assert.ok(route.points.at(-1)[1] < -1.35, 'Below-grade intent, not discharge onto a roof or path');
    for (let i = 1; i < route.points.length; i++)
      assert.ok(route.points[i][1] < route.points[i - 1][1], `${route.id} segment ${i} must descend`);
  }
  assert.ok(served.has('porch') && served.has('rear-low'));
  const unserved = layout.gutters.filter(run => !served.has(run.id));
  assert.deepEqual(unserved.map(run => run.id), ['dining-east'], 'Dining east is mitered to its served rear trough');
});

test('all gutter sections physically fall at 1/16 inch per foot, with matched joins and low points at outlets', () =>
{
  for (const gutter of layout.gutters)
  {
    const length = Math.hypot(gutter.end[0] - gutter.start[0], gutter.end[2] - gutter.start[2]);
    assert.equal(gutter.stations[0].t, 0);
    assert.equal(gutter.stations.at(-1).t, 1);
    for (let i = 1; i < gutter.stations.length; i++)
    {
      const a = gutter.stations[i - 1], b = gutter.stations[i];
      assert.ok(b.t > a.t && a.dropFeet >= 0 && b.dropFeet >= 0);
      close(Math.abs(b.dropFeet - a.dropFeet) / ((b.t - a.t) * length), 1 / 192);
    }
    for (const route of layout.routes.filter(item => item.gutterId === gutter.id))
    {
      const low = roof.gutterDropAt(gutter, route.points[0]);
      for (const offset of [-.01, .01])
      {
        const dx = (gutter.end[0] - gutter.start[0]) / length, dz = (gutter.end[2] - gutter.start[2]) / length;
        const near = [route.points[0][0] + dx * offset, 0, route.points[0][2] + dz * offset];
        assert.ok(roof.gutterDropAt(gutter, near) < low, `${route.id} must be lower than both adjacent gutter positions`);
      }
    }
  }
  for (const [a, b] of [['upper-1', 'upper-3'], ['dining-rear', 'dining-east']])
  {
    const left = layout.gutters.find(run => run.id === a), right = layout.gutters.find(run => run.id === b);
    close(left.stations.at(-1).dropFeet, right.stations[0].dropFeet);
  }
  const rear = layout.gutters.find(run => run.id === 'upper-1');
  close(roof.gutterDropAt(rear, layout.routes.find(route => route.id === 'D6').points[0]) * 12, 1.3578125);
  assert.throws(() => roof.gutterDropAt({ id: 'invalid' }, [0, 0, 0]), /Missing fall stations/);
});

test('D0 collects the outer west valley and keeps its sealed leader outside the porch roof', () =>
{
  const collector = layout.collectors.find(item => item.id === 'D0'), route = layout.routes.find(item => item.id === 'D0');
  const [x, y, z] = collector.valley, [left, right, rear, front] = collector.bounds;
  assert.ok(x > left && x < right && z > rear && z < front);
  assert.ok(collector.topFeet < y && collector.topFeet > collector.bottomFeet);
  assert.ok(route.points.slice(0, -1).every(point => point[0] + .15 < roof.getPorchRoofDefinitions()[0].bounds[0]));
  assert.ok(route.points.at(-1)[1] < -1.35);
  assert.equal(route.supportRequired, true);
  assert.ok(!layout.routes.some(item => item.id === 'D10'), 'Held dining collector is not silently adopted');
});

test('garage projection return is short and shallow, not a pipe across three front gables', () =>
{
  const garage = layout.routes.find(route => route.id === 'D3');
  assert.ok(garage.points.every(point => point[0] > 55.725));
  const [a, b] = garage.points.slice(1, 3);
  close(a[2] - b[2], 4.95);
  assert.ok(a[1] - b[1] > .05 && a[1] - b[1] < .07);
  assert.equal(garage.supportRequired, true);
  const high = layout.routes.find(route => route.id === 'D8');
  assert.ok(high.points[1][0] - .125 > 56.2);
  assert.ok(high.points[1][2] - .125 > 27.5);
  assert.ok(high.supportRequired);
  const windows = require('../assets/js/floor-plan-ground.js').getGarageClerestoryLayout();
  for (const window of windows)
    assert.ok(high.points[3][2] + .125 < window.z - window.width / 2 - .325 ||
      high.points[3][2] - .125 > window.z + window.width / 2 + .325, 'Lower D8 leg clears clerestories and trim');
});

test('porch columns and entry-side roof penetration are explicit without changing room or roof definitions', () =>
{
  const entry = layout.routes.find(route => route.id === 'D1');
  const porch = roof.getPorchRoofDefinitions()[0];
  const [x, y, z] = entry.roofPenetration;
  close(y, roof.heightAt(porch.planes[0], [x, z]));
  assert.ok(x + .125 < 12.38, 'Leader clears the cast-stone entry surround');
  assert.ok(x - .125 > 9.925, 'Leader clears the upper west-bedroom window trim');
  const groundFront = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout();
  assert.ok(entry.points.at(-2)[2] - .15 > groundFront.wallZ + .225, 'Lower leader clears the extended ground-floor brick face');
  assert.ok(entry.points[1][2] - .15 > 53.8 + .425, 'Upper leader clears projecting bedroom brick piers');
  for (const route of layout.routes.filter(item => item.id.startsWith('P1-')))
    assert.ok(Math.abs(route.points[2][0] - route.points[0][0]) > .75, 'Leader clears column capitals and bases');
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  assert.match(source, /belowGradeConnectionApproved: false/);
  assert.match(source, /waterproofingApproved: false/);
  assert.match(source, /widthInches: 3, depthInches: 2, hollow: true/);
  assert.doesNotMatch(source, /0\.14, 'Connected rainwater leader segment'/);
});
