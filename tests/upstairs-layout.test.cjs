'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const upper=require('../assets/js/floor-plan-upstairs.js');
const layout=require('../assets/js/upstairs-layout.js');
const stairs=layout.stairOpening();
const baseline=upper.getUpstairsDefaultPlan(stairs);
const plan=layout.resolve(baseline,layout.empty());
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const room=(p,n)=>p.rooms.find(r=>r.name===n);
const wall=(p,n)=>p.walls.find(r=>r.name===n);

test('owner-corrected Version I has fifteen 30-inch doors plus one 36-inch furnace door, all 96 inches tall',()=>{
  const doors=plan.walls.flatMap(w=>w.openings.filter(o=>o[2]===0));
  assert.equal(doors.length,16);assert.equal(doors.filter(o=>Math.abs(o[1]-o[0]-2.5)<1e-8).length,15);
  doors.forEach(o=>close(o[3],8));close(wall(plan,'East bath north').openings[0][1]-wall(plan,'East bath north').openings[0][0],3);
  assert.equal(wall(plan,'Laundry west').openings.length,0);
  assert.equal(wall(plan,'Laundry north').openings.length,1);
  assert.ok(baseline.registrationException.unresolvedAccess.some(s=>s.includes('Furnace')));
});
test('Version I rectangles match the traced paint-face inventory with explicit primary stair exception',()=>{
  for(const [name,w,d] of [['Primary bath',13.858333,12.025],['Primary closet',13.858333,7.638095],
    ['Bedroom 2 bath',9.078572,5.084523],['Bedroom 2 closet',4.822619,8.161905],
    ['Loft',11.697619,13.334524],['Shared bath west',10.191667,6.211904333333333],['Shared bath east',10.060714,5.084523],
    ['Bedroom 3',12.810714,13.138096],['Bedroom 4',12.614286,13.138096],
    ['Bedroom 3 closet',7.769048,5.084523],['Bedroom 4 closet',5.542857,8.554762],['Mechanical (relocated)',4.626191,5.084523]]){
    const r=room(plan,name);close(r.w-.35,w);close(r.d-.35,d);
  }
  const p=room(plan,'Primary bedroom');close(p.tracedFootprint.d,20.363095);
  close(p.z+p.d,stairs.z-.175);assert.match(p.registrationException,/Straight south wall/);
});
test('Closet 4 reaches the front line and has a single exterior window rather than H recess',()=>{
  const r=room(plan,'Bedroom 4 closet');close(r.z+r.d,55.066667);close(wall(plan,'Closet 4 south').z1,55.066667);
  assert.ok(plan.floors.some(f=>15>f.x&&15<f.x+f.w&&54>f.z&&54<f.z+f.d));
  assert.equal(wall(plan,'Closet 4 south').openings.length,1);
});
test('fixed stair and 44-inch arrival retain ground registration with no traced east wall stubs or south gap',()=>{
  close(stairs.x,.175);close(stairs.z,27+.2/12);close(stairs.width,9+10/12);close(stairs.depth,7.825);
  close(baseline.arrival.x,stairs.x+stairs.width);close(baseline.arrival.w*12,44);close(baseline.arrival.d*12,46.9);
  close(baseline.arrival.z+baseline.arrival.d,stairs.z+stairs.depth);
  close(wall(plan,'Primary south stair notch').z1+.175,stairs.z);
  assert.ok(!plan.walls.some(w=>/^Stairs east /.test(w.name)));
  const south=wall(plan,'West bath north');close(south.z1-south.thickness/2,stairs.z+stairs.depth);
  close(south.x1,0);close(south.x2,room(plan,'Linen').x+room(plan,'Linen').w);
  for(const name of ['Shared bath west','Linen']){
    const r=room(plan,name);close(r.z,south.z1);close(r.z+r.d,41.578571);
    close(r.tracedFootprint.z-r.z,1.127381333333333);
  }
  close(wall(plan,'Stairwell west').z2,south.z1);close(wall(plan,'West bath west').z1,south.z1);
  close(wall(plan,'West bath entry').z1,south.z1);close(wall(plan,'Linen east').z1,south.z1);
  assert.ok(!plan.floors.some(f=>f.name==='South stair connection'));
  const floors=[...plan.floors,baseline.arrival];
  for(const [x,z] of [[5,35.05],[5,35.5],[12,35.5],[11.065476,29],[11.065476,34.9],[14,35.5]])
    assert.equal(floors.filter(f=>x>f.x&&x<f.x+f.w&&z>f.z&&z<f.z+f.d).length,1,`${x},${z} filled once`);
  assert.deepEqual(require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan().stairs,stairs);
});
test('empty version-one saved overrides preserve all Version I geometry and owner data',()=>{
  assert.deepEqual(plan.rooms,baseline.rooms);assert.deepEqual(plan.floors,baseline.floors);assert.equal(plan.windows.length,18);
  for(let i=0;i<baseline.walls.length;i++)assert.deepEqual(plan.walls[i].openings,baseline.walls[i][5]||[]);
  plan.windows.forEach((w,i)=>w.forEach((v,j)=>typeof v==='number'?close(v,baseline.windows[i][j]):assert.equal(v,baseline.windows[i][j])));
  assert.deepEqual(layout.warnings(baseline,layout.empty()),[]);
  assert.deepEqual(JSON.parse(fs.readFileSync(require.resolve('../assets/data/upstairs-layout.json'),'utf8')),layout.empty());
});
test('floors and arrival have unique coverage and the east Loft is real floor rather than attic',()=>{
  const floors=[...plan.floors,baseline.arrival];
  for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++){
    const a=floors[i],b=floors[j];assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)+1e-8||Math.min(a.z+a.d,b.z+b.d)<=Math.max(a.z,b.z)+1e-8,`${a.name}/${b.name}`);
  }
  for(const [x,z] of [[11,33],[14,33],[22,33],[49,25],[49,38],[16,43]])assert.equal(floors.filter(f=>x>f.x&&x<f.x+f.w&&z>f.z&&z<f.z+f.d).length,1,`${x},${z}`);
  assert.ok(plan.floors.some(f=>f.name==='Loft'));assert.ok(!plan.floors.some(f=>/attic/i.test(f.name)));
});
test('bath/closet connection uses corrected clear jambs while laundry retains its north loft entry',()=>{
  const bath=wall(plan,'Bath south').openings[0];close(wall(plan,'Bath south').x1+bath[0],20.654762);
  const entry=wall(plan,'Primary suite entry');close(entry.z1+entry.openings[0][0],13.15);
  assert.equal(wall(plan,'Primary closet south').openings.length,0);
  const laundry=wall(plan,'Laundry north');close(laundry.x1+laundry.openings[0][0],44.494048);
  close(laundry.z1,33.459524);close(wall(plan,'Laundry notch return').z1,36.144048);
  for(const n of ['Bedroom 3 entry','Bedroom 4 entry'])assert.equal(wall(plan,n).openings.length,1);
});
test('changed room widths retain floor transforms, adjoining wall joins and fixed window widths',()=>{
  const edit=layout.editRoom(baseline,layout.empty(),'Bedroom 4',{w:13});
  const p=layout.resolve(baseline,edit);
  close(room(p,'Bedroom 4').w,13);
  close(wall(p,'Bedroom 4 east').x1,19.053571+13);
  const before=baseline.windows.find(w=>w[0]==='Bedroom 4 front');
  const after=p.windows.find(w=>w[0]===before[0]);
  close(after[3],before[3]);
  assert.equal(layout.serialize(JSON.parse(layout.serialize(edit))),layout.serialize(edit));
});
test('wall movement follows T-junctions and room bounds without scaling openings',()=>{
  const p=layout.resolve(baseline,layout.editWall(baseline,layout.empty(),'Bedroom 4 east',{x1:31.7,x2:31.7}));
  close(room(p,'Bedroom 4').w,31.7-19.053571);
  close(wall(p,'Bedroom 4 south').x2,31.7);
  const a=wall(plan,'Bedroom 4 south').openings,b=wall(p,'Bedroom 4 south').openings;
  a.forEach((o,i)=>close(o[1]-o[0],b[i][1]-b[i][0]));
});
test('wall thickness and length remain physical data and cannot shorten through windows',()=>{
  const original=wall(plan,'Bedroom 3 west');
  const p=layout.resolve(baseline,layout.editWall(baseline,layout.empty(),original.name,{z2:53,thickness:.5}));
  close(wall(p,original.name).thickness,.5);
  close(p.windows.find(w=>w[0]==='Bedroom 3 west')[3],5);
  assert.throws(()=>layout.editWall(baseline,layout.empty(),original.name,{z2:46}),/too short/);
});
test('invalid schema dimensions duplicates orientation and unsupported fields fail explicitly',()=>{
  for(const value of [{version:2,rooms:[],walls:[]},{version:1,rooms:[],walls:[],unexpected:true},
    {version:1,rooms:[{name:'Unknown',x:0,z:0,w:5,d:5}],walls:[]},
    {version:1,rooms:[{name:'Bedroom 4',x:null,z:40,w:12,d:11}],walls:[]},
    {version:1,rooms:[{name:'Bedroom 4',x:19,z:40,w:-1,d:11}],walls:[]}])assert.throws(()=>layout.resolve(baseline,value));
  const r={name:'Bedroom 4',x:19,z:40,w:12,d:11};
  assert.throws(()=>layout.resolve(baseline,{version:1,rooms:[r,r],walls:[]}),/duplicate/);
  assert.throws(()=>layout.editWall(baseline,layout.empty(),'Bedroom 4 east',{x2:32}),/orientation/);
});
test('rooms and walls cannot cover the protected fixed stair',()=>{
  assert.throws(()=>layout.editRoom(baseline,layout.empty(),'Mechanical (relocated)',{x:5,z:28}),/stair/);
  assert.throws(()=>layout.editWall(baseline,layout.empty(),'West bath north',{z1:30,z2:30}),/stair/);
});
test('proportional furniture anchors do not scale furniture and serialization does not mutate prior state',()=>{
  const before=JSON.stringify(baseline);
  const first=layout.editRoom(baseline,layout.empty(),'Bedroom 4',{w:13.5});
  const snapshot=layout.serialize(first);
  const p=layout.resolve(baseline,first),pos=layout.furniturePosition(baseline,p,24.95,45);
  close(pos.x,19.053571+(24.95-19.053571)*13.5/12.964286);close(pos.z,45);
  assert.throws(()=>layout.editRoom(baseline,first,'Bedroom 4',{w:-3}));
  assert.equal(layout.serialize(first),snapshot);assert.equal(JSON.stringify(baseline),before);
});
test('walls translate in four directions with axis-aligned connected joins',()=>{
  // Exercise join propagation on a nondegenerate rectangle; the approved
  // compact perimeter's 1.8-inch service step cannot translate by 3 inches.
  const fixture={rooms:[{name:'Left',x:0,z:0,w:5,d:10},{name:'Right',x:5,z:0,w:5,d:10}],
    floors:[],windows:[],stairs:{x:20,z:20,width:4,depth:8},
    walls:[['Shared',5,0,5,10],['North',0,0,10,0],['South',0,10,10,10],['West',0,0,0,10],['East',10,0,10,10]]};
  const original=layout.resolve(fixture,layout.empty());
  for(const name of ['Shared','North'])for(const [dx,dz] of [[-.25,0],[.25,0],[0,-.25],[0,.25]]){
    const b=wall(original,name);
    const p=layout.resolve(fixture,layout.editWall(fixture,layout.empty(),name,{x1:b.x1+dx,z1:b.z1+dz,x2:b.x2+dx,z2:b.z2+dz}));
    close(wall(p,name).x1,b.x1+dx);close(wall(p,name).z1,b.z1+dz);
    for(const w of p.walls)assert.ok(Math.abs(w.x1-w.x2)<.001||Math.abs(w.z1-w.z2)<.001,w.name);
  }
});
