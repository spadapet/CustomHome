'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const roof = require('../assets/js/floor-plan-roof.js');
const upper = require('../assets/js/floor-plan-upstairs.js');
const layout = require('../assets/js/upstairs-layout.js');
const plan = layout.resolve(upper.getUpstairsDefaultPlan(layout.stairOpening()), layout.empty());
const overlaps = (r, x, z, w, d) => Math.min(r.x+r.w,x+w)>Math.max(r.x,x)+1e-8 &&
  Math.min(r.z+r.d,z+d)>Math.max(r.z,z)+1e-8;
const garage = [[44.233333333333,15,11.266666666667,11.9],[31.2,26.9,24.3,22.1]];

test('no bedroom paint-face interior overlaps either actual stepped garage bay', () => {
  for (const room of plan.rooms.filter(r=>/^(Primary bedroom|Bedroom [234])$/.test(r.name))) {
    const clear = {x:room.x+.175,z:room.z+.175,w:room.w-.35,d:room.d-.35};
    for (const bay of garage) assert.ok(!overlaps(clear,...bay),room.name);
  }
  for (const name of ['Laundry (relocated)','Shared bath east','Mechanical (relocated)']) {
    assert.ok(garage.some(b=>overlaps(plan.rooms.find(r=>r.name===name),...b)), name);
  }
  assert.ok(!plan.rooms.some(r=>/Loft/.test(r.name)));
  assert.deepEqual(JSON.parse(fs.readFileSync(require.resolve('../assets/data/upstairs-layout.json'),'utf8')),layout.empty());
});

test('all compact exterior opening projections agree with furnished window hosts', () => {
  const segments = upper.getUpstairsExteriorSegments();
  for (const [name,x,z,width] of plan.windows) {
    const hosts = segments.filter(([,x1,z1,x2,z2]) => {
      const length=Math.hypot(x2-x1,z2-z1);
      const along=((x-x1)*(x2-x1)+(z-z1)*(z2-z1))/length;
      return Math.abs((x-x1)*(z2-z1)-(z-z1)*(x2-x1))/length<.15 &&
        along-width/2>=0 && along+width/2<=length;
    });
    assert.equal(hosts.length,1,name);
  }
  assert.equal(segments.length,14,'Aligned rear removes the two zero-length bath projection returns');
  for(const [,x1,z1,x2,z2] of segments)assert.ok(Math.hypot(x2-x1,z2-z1)>0);
  for(const name of ['Primary bedroom','Primary bath','Primary toilet','Bedroom 2 bath','Bedroom 2 closet'])
    assert.equal(plan.rooms.find(r=>r.name===name).z,6.65);
});

test('actual roof envelope reserves nine-foot walls and 18-inch framing above every upstairs floor', () => {
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  let count=0;
  for(const r of plan.floors) for(let x=r.x+.2;x<r.x+r.w;x+=.65)for(let z=r.z+.2;z<r.z+r.d;z+=.65){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[x,z]));
    assert.ok(faces.length,`Roof missing at ${x},${z}`);
    const skin=Math.max(...faces.map(f=>roof.heightAt(f.plane,[x,z])));
    assert.ok(skin-.16-1.5>=19-1e-7,`Nine-foot wall/framing clearance at ${x},${z}: ${skin}`);
    count++;
  }
  assert.ok(count>3000);
  assert.ok(!roof.getConnectedRoofDefinitions().some(d=>/Loft/.test(d.id)));
  assert.ok(roof.getLowerRoofDefinitions().some(d=>d.id==='Garage service return'));
});
