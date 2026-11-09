'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const roof = require('../assets/js/floor-plan-roof.js');
const upper = require('../assets/js/floor-plan-upstairs.js');
const layout = require('../assets/js/upstairs-layout.js');
const plan = layout.resolve(upper.getUpstairsDefaultPlan(layout.stairOpening()), layout.empty());
const g = upper.getUpstairsMeasuredGeometry();
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
  assert.equal(plan.rooms.filter(r=>r.name==='Finished loft').length,1);
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
  assert.equal(segments.length,13,'Version H perimeter segments follow its straight rear and stepped attic outline');
  for(const [,x1,z1,x2,z2] of segments)assert.ok(Math.hypot(x2-x1,z2-z1)>0);
  for(const name of ['Primary bedroom','Primary bath','Primary toilet','Bedroom 2 bath','Bedroom 2 closet'])
    assert.equal(plan.rooms.find(r=>r.name===name).z,g.north);
});

test('actual roof envelope reserves nine-foot walls and 18-inch framing above every upstairs floor', () => {
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  let count=0;
  for(const r of plan.floors) for(let x=r.x+.2;x<r.x+r.w;x+=.65)for(let z=r.z+.2;z<r.z+r.d;z+=.65){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[x,z]));
    assert.ok(faces.length,`Roof missing at ${x},${z}`);
    const skin=Math.max(...faces.map(f=>roof.heightAt(f.plane,[x,z])));
    if(r.room==='Finished loft'){
      const section=roof.getFinishedLoftSection();
      const lining=10+section.heightAt(x);
      assert.ok(skin-section.skinDepthFeet-section.framingReserveFeet-section.liningDepthFeet>=lining-1e-7,
        `Loft flat lining and full provisional framing reserve at ${x},${z}`);
      assert.equal(lining,19,`Nine-foot loft ceiling at ${x},${z}`);
      assert.equal(section.framingReserveFeet,1.5);
    }else{
      assert.ok(skin-.16-1.5>=19-1e-7,`Nine-foot wall/framing clearance at ${x},${z}: ${skin}`);
    }
    count++;
  }
  assert.ok(count>3000);
  assert.ok(!roof.getConnectedRoofDefinitions().some(d=>/Loft/.test(d.id)));
  assert.ok(roof.getLowerRoofDefinitions().some(d=>d.id==='Garage service return'));
});

test('raised shed covers every loft edge with nine-foot ceiling, lining and 18-inch framing', () => {
  const definitions=roof.getConnectedRoofDefinitions();
  const envelope=roof.buildRoofEnvelope(definitions);
  const attic=definitions.find(d=>d.id==='Garage attic storage roof');
  assert.ok(attic);
  assert.deepEqual(attic.bounds,[g.east-.225,g.atticEast+.7,g.atticNorth-.75,g.atticSouth+.225]);
  const routeZ=(29.8+32.8)/2;
  let minimum=Infinity;
  for(let x=g.east;x<=g.atticEast;x+=.25){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[x,routeZ]));
    assert.ok(faces.length,`Roof covers the access path at ${x}`);
    const underside=Math.max(...faces.map(f=>roof.heightAt(f.plane,[x,routeZ])))-.16;
    minimum=Math.min(minimum,underside-10);
  }
  assert.ok(minimum>=9+1.5+.05-1e-7,`Access-path assembly height is ${minimum} ft`);
  const loft=upper.getUpstairsLoftGeometry(),section=roof.getFinishedLoftSection();
  for(const x of [loft.x,g.atticEast,g.atticEast+.175])for(const z of [loft.z-.175,loft.z+loft.d+.175]){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[x,z]));
    assert.ok(faces.length,`Roof covers finished loft wall at ${x},${z}`);
    const skin=Math.max(...faces.map(f=>roof.heightAt(f.plane,[x,z])));
    assert.ok(skin-section.skinDepthFeet-section.framingReserveFeet-section.liningDepthFeet>=19-1e-7,
      `Full loft assembly clears actual envelope at ${x},${z}: ${skin}`);
    assert.equal(section.heightAt(x),9);
  }
  const service=definitions.find(d=>d.id==='Garage service return');
  for(let x=attic.bounds[0];x<=attic.bounds[1];x+=.25){
    const p=[x,attic.bounds[3]];
    const a=roof.heightAt(attic.planes[0],p),b=Math.min(...service.planes.map(plane=>roof.heightAt(plane,p)));
    assert.ok(Math.abs(a-b)<1e-7,`Continuous shed/service return at ${x}`);
  }
  assert.ok(roof.getLowerRoofDefinitions().some(d=>d.id==='Garage attic storage roof'));
});
