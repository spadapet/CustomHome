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
  const segments = getUpstairsExteriorSegments().filter(([name]) => !['front bedrooms','front bedroom 4'].includes(name)).map(([, ...s]) => s);
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
  assert.equal(count, 16);
});

test('Version I front window pairs retain centered 30-inch units and the flush closet front', () => {
  const plan = getUpstairsDefaultPlan(stairOpening());
  const windows = getUpstairsFrontWindows();
  assert.equal(windows.length,4);
  for(const window of windows){
    assert.equal(window.width,2.5);
    assert.equal(window.sill,3);
    assert.equal(window.sill+window.height,8);
    const frame=plan.windows.find(frame=>frame[0]===window.openingId);
    assert.ok(frame);
    assert.equal(frame[3],5);
    close(Math.abs(frame[1]-window.center),1.25);
  }
  for(const [name,...segment] of getUpstairsExteriorSegments().filter(([name])=>['front bedrooms','front bedroom 4'].includes(name))){
    const openings=getUpstairsExteriorOpenings(...segment);
    assert.equal(openings.length,1,name);
    assert.equal(openings[0].width,5);
    const frame=plan.windows.find(frame=>frame[0]===openings[0].name);
    assert.ok(frame);
    close(frame[1],segment[0]+openings[0].center);
  }
  close((windows[0].center+windows[1].center)/2,6.580357);
  close((windows[2].center+windows[3].center)/2,25.535714);
  close(g.south,55.066667);
  const definitions=roof.getConnectedRoofDefinitions();
  assert.ok(!definitions.some(d=>/attic/i.test(d.id)));
  assert.ok(plan.windows.some(w=>/Loft/i.test(w[0])));
  assert.ok(plan.windows.some(w=>/Closet 4/i.test(w[0])));
});

test('loft and laundry east-side windows remain below the full-height hip eave', () => {
  const eastWindows=getUpstairsExteriorOpenings(g.east,g.loftNorth,g.east,g.bedNorth);
  assert.equal(eastWindows.length,2);
  const loft=roof.getConnectedRoofDefinitions().find(d=>d.id==='East loft wing');
  close(loft.bounds[1]-g.east,.75);
  for(const window of eastWindows){
    const point=[g.east,window.center+g.loftNorth];
    const skin=Math.min(...loft.planes.map(plane=>roof.heightAt(plane,point)));
    assert.ok(skin-.16>=window.sill+window.height, `${window.name}: full-height loft/laundry head clearance`);
  }
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'assets/js/floor-plan-exterior.js'), 'utf8');
  assert.ok(source.includes('getUpstairsExteriorSegments()'), 'Exterior uses the same measured perimeter');
});
