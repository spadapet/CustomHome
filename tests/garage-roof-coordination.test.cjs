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

test('Version I preserves its small Bedroom 2 and 4 over-garage bands with explicit approval holds', () => {
  const bedroomOverbuild = new Map();
  for (const room of plan.rooms.filter(r=>/^(Primary bedroom|Bedroom [234])$/.test(r.name))) {
    let area = 0;
    for (const floor of plan.floors.filter(f=>f.room===room.name)) for (const [x,z,w,d] of garage) {
      const west=Math.max(floor.x,room.x+.175,x),east=Math.min(floor.x+floor.w,room.x+room.w-.175,x+w);
      const north=Math.max(floor.z,room.z+.175,z),south=Math.min(floor.z+floor.d,room.z+room.d-.175,z+d);
      area+=Math.max(0,east-west)*Math.max(0,south-north);
    }
    if (area>1e-8) bedroomOverbuild.set(room.name,area);
  }
  assert.deepEqual([...bedroomOverbuild.keys()],['Bedroom 2','Bedroom 4']);
  assert.ok(Math.abs(bedroomOverbuild.get('Bedroom 2')-8.59709195856)<1e-8);
  assert.ok(Math.abs(bedroomOverbuild.get('Bedroom 4')-4.658417607653)<1e-8);
  const notes=fs.readFileSync(require.resolve('../floor-plan-reference.md'),'utf8');
  assert.match(notes,/Bedroom 2 and Bedroom 4[^\n]*over-garage/);
  assert.match(notes,/support\/fire separation/);
  for (const name of ['Laundry (relocated)','Shared bath east','Mechanical (relocated)']) {
    assert.ok(garage.some(b=>overlaps(plan.rooms.find(r=>r.name===name),...b)), name);
  }
  const loft=plan.rooms.find(r=>r.name==='Loft');
  assert.ok(loft&&garage.some(b=>overlaps(loft,...b)), 'Owner-authorized loft occupies the former attic over the garage');
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
  assert.ok(segments.length>=8,'Version I perimeter follows the loft step and flush central front closet');
  for(const [,x1,z1,x2,z2] of segments)assert.ok(Math.hypot(x2-x1,z2-z1)>0);
  for(const name of ['Primary bedroom','Primary bath','Bedroom 2 bath','Bedroom 2 closet'])
    assert.equal(plan.rooms.find(r=>r.name===name).z,g.north);
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
  assert.ok(roof.getConnectedRoofDefinitions().some(d=>d.id==='East loft wing'));
  assert.ok(roof.getLowerRoofDefinitions().some(d=>d.id==='Garage service return'));
});

test('Version I loft replaces the attic with a full-height hip and a north laundry connection', () => {
  const definitions=roof.getConnectedRoofDefinitions();
  const envelope=roof.buildRoofEnvelope(definitions);
  const loft=definitions.find(d=>d.id==='East loft wing');
  assert.ok(loft);
  assert.deepEqual(loft.bounds,[g.loftWest-.75,g.east+.75,g.loftNorth-.75,g.bedNorth+.75]);
  assert.ok(!definitions.some(d=>/attic/i.test(d.id)));
  let minimum=Infinity;
  for(let x=g.loftWest+.175;x<=g.east-.175;x+=.25){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[x,g.laundryNorth]));
    assert.ok(faces.length,`Roof covers the loft/laundry connection at ${x}`);
    minimum=Math.min(minimum,Math.max(...faces.map(f=>roof.heightAt(f.plane,[x,g.laundryNorth])))-.16-10);
  }
  assert.ok(minimum>=10.5-1e-7,`Modeled roof underside above floor: ${minimum} ft`);
});
