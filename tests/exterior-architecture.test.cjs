'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const roof = require('../assets/js/floor-plan-roof.js');
const upper = require('../assets/js/floor-plan-upstairs.js');
const front = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b} ft`);
const height = (definitions, x, z) => Math.max(...definitions
  .filter(({bounds:[l,r,b,f]}) => x >= l && x <= r && z >= b && z <= f)
  .map(({planes}) => Math.min(...planes.map(p => roof.heightAt(p, [x,z])))));

test('paired cross-gables center on fixed bedroom banks with measured rise and subordinate garage', () => {
  const defs = roof.getConnectedRoofDefinitions();
  const gables = defs.filter(d => /^(?:East|West) front gable$/.test(d.id));
  assert.equal(gables.length, 2);
  const windows = upper.getUpstairsFrontWindows();
  gables.forEach((g, i) => {
    const [left,right,rear,frontZ] = g.bounds, center = (left+right)/2;
    close(center, (windows[i*2].center+windows[i*2+1].center)/2);
    close(right-left, 14.35);
    close(Math.hypot(g.planes[0][0],g.planes[0][1])*12, 6.2/7.175*12);
    close(height([g],center,frontZ),25.4);
    close(rear,40.5);
  });
  const garage = defs.find(d => d.id === 'Garage hip');
  const measured = upper.getUpstairsMeasuredGeometry();
  const attic = defs.find(d => d.id === 'Garage attic storage roof');
  close(height([garage],43.25,42.7),9.65);
  assert.ok(height(defs,43.25,39)>20.6,'Shared upper wing roofs the actual full-height service rooms');
  close(attic.bounds[0]-measured.east,-.225);
  assert.ok(height([attic],measured.east,30.7)-.16>19+1.5,
    'Raised shed overlaps the wing wall above its window heads and full loft assembly');
  assert.ok(height(defs,attic.bounds[0],30.7)-.16>18,'Attic eave remains above the 8-ft laundry window head');
});

test('cross-gable union never reduces the accepted headroom envelope and leaves rear solar surfaces unchanged', () => {
  const defs = roof.getConnectedRoofDefinitions(), base = defs.filter(d => !/front gable|cross-gable/.test(d.id));
  let samples = 0;
  for (let x = -0.5; x < 56; x += .5) for (let z = -1; z < 54.5; z += .5) {
    const before = height(base,x,z), after = height(defs,x,z);
    if (!Number.isFinite(before)) continue;
    assert.ok(after >= before-1e-7, `Envelope reduced at ${x},${z}`);
    if (z < 22.5) close(after,before);
    samples++;
  }
  assert.ok(samples > 8000);
});

test('porch roof is one straight coplanar low-slope plane with no raised entry hump or added footprint', () => {
  const defs = roof.getPorchRoofDefinitions(), main = defs[0];
  assert.deepEqual(defs.map(d => d.id), ['Porch metal', 'Porch recess metal']);
  assert.ok(defs.every(d => d.planes.length === 1 && d.planes[0].every((v, i) => Math.abs(v - main.planes[0][i]) < 1e-12)), 'one shared plane');
  const g = upper.getUpstairsMeasuredGeometry();
  close(main.bounds[2], g.south);
  assert.deepEqual(defs[1].bounds, [g.southClosetWest, g.southClosetEast, g.southClosetSouth, g.south]);
  close(main.bounds[3], 62.25 + front.extension);
  // Constant eave height across every bay: no arch rise over the entry.
  for (const x of [0, 5, 11, 12.5, 15.6, 18.7, 20, 26, 31]) close(height(defs, x, main.bounds[3]), height(defs, 0, main.bounds[3]));
  assert.equal(roof.buildRoofEnvelope(defs).joins.length, 0);
});

test('entry bay keeps a straight beam and continuous fascia with no arch closure, curved infill or separate entry ceiling', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  assert.doesNotMatch(source, /closureProfile|barrelTopAt|Entry barrel metal|entry roof end closure|entry-bay porch ceiling|Straight entry fascia|Porch side fascia/);
  assert.doesNotMatch(source,/archProfile|Segmental entry canopy arch/);
  assert.match(source, /box\(group, 15\.6, porchFasciaTop - porchFasciaHeight \/ 2, porchFasciaZ,\s+31\.85 \+ 0\.65, porchFasciaHeight, porchFasciaDepth, trim\);\s+porchFascia\.name = 'Continuous straight porch fascia';/);
});
