'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getUpstairsDefaultPlan, getUpstairsExteriorOpenings, getUpstairsExteriorSegments, getUpstairsMeasuredGeometry } = require('../assets/js/floor-plan-upstairs.js');
const g = getUpstairsMeasuredGeometry();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('every side/rear exterior upper opening projects from the furnished frame and cut wall', () => {
  const plan = getUpstairsDefaultPlan({ x: 4, z: 28, width: 4, depth: 8 });
  const segments = getUpstairsExteriorSegments().filter(([name]) => name !== 'front bedrooms').map(([, ...s]) => s);
  let count = 0;
  for (const [x1, z1, x2, z2] of segments) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    for (const opening of getUpstairsExteriorOpenings(x1, z1, x2, z2)) {
      count++;
      const frame = plan.windows.find(([name]) => name === opening.name);
      assert.ok(frame);
      const x = x1 + (x2 - x1) * opening.center / length;
      const z = z1 + (z2 - z1) * opening.center / length;
      close(x2 === x1 ? z : x, x2 === x1 ? frame[2] : frame[1]);
      close(opening.width, frame[3]);
      assert.equal(opening.sill, 13);
      assert.equal(opening.height, 5);
      const cuts = plan.walls.flatMap(([, ax, az, bx, bz, holes = []]) => {
        const l = Math.hypot(bx - ax, bz - az);
        return holes.filter(h => h[2] === 3 && h[3] === 8).map(h => ({
          x: ax + (bx - ax) * (h[0] + h[1]) / 2 / l,
          z: az + (bz - az) * (h[0] + h[1]) / 2 / l, width: h[1] - h[0]
        }));
      });
      assert.ok(cuts.some(c => Math.hypot(c.x - x, c.z - z) < 1e-8 && c.width === opening.width),
        `${opening.name}: exterior glass must align with a real furnished wall opening`);
    }
  }
  assert.equal(count, 9);
});

test('removed loft has no facade-only window; laundry east has its coordinated wall opening', () => {
  const openings = getUpstairsExteriorOpenings(g.east,g.laundryNorth,g.east,g.serviceSouth);
  assert.equal(openings.length,1);
  close(openings[0].center,30.7-g.laundryNorth);
  assert.equal(openings[0].width,3);
  assert.ok(!getUpstairsDefaultPlan(require('../assets/js/upstairs-layout.js').stairOpening()).windows.some(w=>/Loft/.test(w[0])));
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'assets/js/floor-plan-exterior.js'), 'utf8');
  assert.ok(source.includes('getUpstairsExteriorSegments()'), 'Exterior uses the same measured perimeter');
});

test('previous closet-facing loft window and displaced west windows are eliminated', () => {
  const east = getUpstairsExteriorOpenings(g.east, g.loftNorth, g.east, g.serviceSouth);
  assert.equal(east.length,1);
  close(east[0].center,30.7-g.loftNorth);
  const west = getUpstairsExteriorOpenings(0, g.north, 0, g.south);
  west.forEach((o, i) => close(g.north + o.center, [g.north + 5, g.north + 14, 31.1, g.bedNorth + 6][i]));
});
