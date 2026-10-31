'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const roof = require('../floor-plan-roof.js');
const upper = require('../floor-plan-upstairs.js');
const front = require('../floor-plan-ground.js').getGroundFrontLayout();
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
  close(height([garage],43.25,42.7),12.475);
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

test('entry barrel has a real 19.2-inch rise, falling rear return and no added porch footprint', () => {
  const defs = roof.getPorchRoofDefinitions(), main = defs[0], barrel = defs[1];
  const z = main.bounds[3], center = 15.6;
  close(height(defs,center,z)-height([main],center,z),1.6);
  for (const x of [barrel.bounds[0],barrel.bounds[1]]) close(height(defs,x,z),height([main],x,z));
  close(height(defs,center,barrel.bounds[2]),height([main],center,barrel.bounds[2]));
  assert.ok(barrel.bounds[0] > main.bounds[0] && barrel.bounds[1] < main.bounds[1]);
  close(barrel.bounds[3],main.bounds[3]);
  assert.ok(roof.buildRoofEnvelope(defs).joins.some(j => j.type === 'valley'));
});

test('production arch trim is an open, dimensioned extruded curved band, not a blocking rectangle', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'),'utf8');
  class Shape {
    constructor(){this.points=[];}
    moveTo(x,y){this.points.push([x,y]);}
    lineTo(x,y){this.points.push([x,y]);}
    closePath(){}
  }
  const c = { THREE:{Shape,ExtrudeGeometry:class{constructor(shape,options){Object.assign(this,{shape,options});}},
    Mesh:class{constructor(geometry){this.geometry=geometry;this.position={set(){}};}}},
    porchFasciaZ:62.15+front.extension,trim:{},entryPortal:{add(o){c.arch=o;}},
    porchCanopyUndersideAt:z=>10.5-(z-57.5-front.extension)*Math.tan(.13)-.11/Math.cos(.13),
    porchRoof:{userData:{}} };
  vm.runInNewContext(source.slice(source.indexOf('  const archProfile ='),
    source.indexOf('  for (const center of [37, 48.5])')),c);
  const points=c.arch.geometry.shape.points;
  close(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),9.15);
  close(c.arch.geometry.options.depth,.65);
  close(points[8][1]-points[0][1],1.6);
  close(points[8][1]-points[25][1],.7);
  assert.ok(points[25][1]>10.5,'Open center clears the 96-inch door crown, no flat lintel across it');
});
