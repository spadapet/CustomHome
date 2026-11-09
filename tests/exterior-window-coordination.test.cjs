'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getUpstairsDefaultPlan, getUpstairsExteriorOpenings, getUpstairsExteriorSegments, getUpstairsFrontWindows, getUpstairsMeasuredGeometry } = require('../assets/js/floor-plan-upstairs.js');
const { stairOpening } = require('../assets/js/upstairs-layout.js');
const roof = require('../assets/js/floor-plan-roof.js');
const g = getUpstairsMeasuredGeometry();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('every side/rear exterior upper opening projects from the furnished frame and cut wall', () => {
  const plan = getUpstairsDefaultPlan(stairOpening());
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
      assert.ok(cuts.some(c => Math.hypot(c.x - x, c.z - z) < 1e-8 && Math.abs(c.width - opening.width) < 1e-8),
        `${opening.name}: exterior glass must align with a real furnished wall opening`);
    }
  }
  assert.equal(count, 8);
});

test('Version H front window pairs retain their measured centers and clear the attic roof', () => {
  const plan = getUpstairsDefaultPlan(stairOpening());
  const windows = getUpstairsFrontWindows();
  assert.equal(windows.length,4);
  for(const window of windows){
    assert.equal(window.width,3);
    assert.equal(window.sill,3);
    assert.equal(window.sill+window.height,8);
    assert.ok(plan.windows.some(frame=>frame[0]===window.name));
  }
  close((windows[0].center+windows[1].center)/2,6.175);
  close((windows[2].center+windows[3].center)/2,25.025);
  close(g.south,53.8);
  const definitions=roof.getConnectedRoofDefinitions();
  const attic=definitions.find(d=>d.id==='Garage attic storage roof');
  assert.ok(attic);
  assert.ok(attic.bounds[3]<g.south,'Attic roof stops well before the front bedroom windows');
  close(definitions.find(d=>d.id==='East rear wing').bounds[1]-attic.bounds[0],.975);
  assert.ok(!plan.windows.some(w=>/Loft/i.test(w[0])));
});

test('raised attic roof overlaps the wing wall above, not through, the unchanged side-window heads', () => {
  const eastWindows=getUpstairsExteriorOpenings(g.east,g.bedroom2North,g.east,g.laundryNorth);
  assert.ok(eastWindows.length>=2);
  const attic=roof.getConnectedRoofDefinitions().find(d=>d.id==='Garage attic storage roof');
  close(attic.bounds[0]-g.east,-.225);
  for(const window of eastWindows){
    const head=window.sill+window.height;
    assert.ok(roof.heightAt(attic.planes[0],[attic.bounds[0],window.center+g.bedroom2North])-.16>=head,
      `${window.name}: attic eave underside remains above the 8-ft window head`);
  }
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'assets/js/floor-plan-exterior.js'), 'utf8');
  assert.ok(source.includes('getUpstairsExteriorSegments()'), 'Exterior uses the same measured perimeter');
});
