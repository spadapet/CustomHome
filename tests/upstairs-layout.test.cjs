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

test('Version H has sixteen 96-inch doorways including direct attic access',()=>{
  const doors=plan.walls.flatMap(w=>w.openings.filter(o=>o[2]===0));
  assert.equal(doors.length,16);
  assert.ok(doors.every(o=>o[3]===8&&o[1]-o[0]>=2.5-1e-8));
});
test('Version H paint-face inventory matches the owner SVG',()=>{
  for(const [name,w,d] of [['Primary bedroom',14,19],['Primary bath',13.55,11.25],['Primary closet',13.55,7.4],
    ['Bedroom 2 bath',8.633333333333333,5.65],['Bedroom 2 closet',5,6.65],['Laundry (relocated)',11,8],
    ['Shared bath west',9,5],['Shared bath east',9,5],['Bedroom 3',12,13],
    ['Bedroom 4',12,13],['Bedroom 4 closet',6.15,5],['Mechanical (relocated)',5.483333333333333,5]]){
    const r=room(plan,name);
    close(r.w-.35,w);close(r.d-.35,d);
  }
  close(room(plan,'Bedroom 2').w-.35,13.983333333333333);
  close(room(plan,'Bedroom 2').d-.35,13);
});
test('Closet 4 two-foot front recess has real walls and no added floor',()=>{
  const r=room(plan,'Bedroom 4 closet'),front=wall(plan,'Closet 4 south');
  close(r.z+r.d,51.8);close(front.z1,51.8);
  for(const name of ['Closet 4 west return','Closet 4 east return'])close(Math.abs(wall(plan,name).z2-wall(plan,name).z1),2);
  assert.ok(!plan.floors.some(f=>15>f.x&&15<f.x+f.w&&52>f.z&&52<f.z+f.d));
});
test('fixed stair and 44-inch arrival preserve their exact ground registration',()=>{
  close(stairs.x,.175);close(stairs.z,27+.2/12);close(stairs.width,9+10/12);close(stairs.depth,7.825);
  close(baseline.arrival.x,stairs.x+stairs.width);close(baseline.arrival.w*12,44);close(baseline.arrival.d*12,46.9);
  close(baseline.arrival.z+baseline.arrival.d,stairs.z+stairs.depth);
  close(baseline.floors.find(f=>f.name==='North arrival approach').z,stairs.z);
  const ground=require('../assets/js/floor-plan-ground.js').getGroundFloorDefaultPlan();
  assert.deepEqual(ground.stairs,stairs);
});
test('empty version-one saved overrides preserve baseline rooms floors walls windows without warnings',()=>{
  assert.deepEqual(plan.rooms,baseline.rooms);assert.deepEqual(plan.floors,baseline.floors);
  assert.equal(plan.windows.length,12);
  for(let i=0;i<baseline.walls.length;i++)assert.deepEqual(plan.walls[i].openings,baseline.walls[i][5]||[]);
  plan.windows.forEach((w,i)=>w.forEach((v,j)=>typeof v==='number'?close(v,baseline.windows[i][j]):assert.equal(v,baseline.windows[i][j])));
  assert.deepEqual(layout.warnings(baseline,layout.empty()),[]);
  assert.deepEqual(JSON.parse(fs.readFileSync(require.resolve('../assets/data/upstairs-layout.json'),'utf8')),layout.empty());
});
test('gallery is continuous unique floor coverage around the stair without orphan loft slabs',()=>{
  for(let i=0;i<plan.floors.length;i++)for(let j=0;j<i;j++){
    const a=plan.floors[i],b=plan.floors[j];
    assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)+1e-8 ||
      Math.min(a.z+a.d,b.z+b.d)<=Math.max(a.z,b.z)+1e-8,`${a.name}/${b.name}`);
  }
  for(const [x,z] of [[11,33],[14,33],[16.5,33],[22,33],[26,30],[20,38],[26.5,25]]){
    assert.equal([...plan.floors,baseline.arrival].filter(f=>x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d).length,1,`${x},${z}`);
  }
  assert.ok(!plan.floors.some(f=>/loft/i.test(f.name)));
});
test('Version H suite enters the bathroom then closet and all bedroom entries face the gallery',()=>{
  assert.deepEqual(wall(plan,'Bath south').openings,[[6.35,8.85,0,8]]);
  assert.equal(wall(plan,'Primary closet south').openings.length,0);
  assert.deepEqual(wall(plan,'Primary suite entry').openings,[[6.1,9.1,0,8]]);
  assert.equal(wall(plan,'Primary closet east').openings.length,0);
  assert.deepEqual(wall(plan,'Primary south').openings,[[10.85,13.85,0,8]]);
  assert.deepEqual(wall(plan,'Bedroom 2 south').openings,[[.6,3.6,0,8]]);
  for(const n of ['Bedroom 3 north','Bedroom 4 north'])assert.equal(wall(plan,n).openings.length,2);
});
test('laundry notch, attic route and mechanical entry match exact Version H openings',()=>{
  close(wall(plan,'Laundry notch west').x1,32.23333333333333);
  close(wall(plan,'Laundry notch return').z1,29.8);
  close(wall(plan,'Laundry west').x1,31.23333333333333);
  for(const name of ['Laundry west','Laundry east']){
    const w=wall(plan,name),o=w.openings[0];
    close(w.z1+o[0],29.8);close(w.z1+o[1],32.8);
  }
  const w=wall(plan,'Laundry south'),o=w.openings[0];
  close(w.x1+o[0],39.35);close(w.x1+o[1],42.35);
  assert.ok(plan.floors.some(f=>f.name==='Bedroom 2 entry notch'&&f.w===1));
  assert.ok(!plan.floors.some(f=>/attic|linen extension/i.test(f.name)));
});
test('changed room widths retain floor transforms, adjoining wall joins and fixed window widths',()=>{
  const edit=layout.editRoom(baseline,layout.empty(),'Bedroom 4',{w:13});
  const p=layout.resolve(baseline,edit);
  close(room(p,'Bedroom 4').w,13);
  close(wall(p,'Bedroom 4 east').x1,31.85);
  const before=baseline.windows.find(w=>w[0]==='Bedroom 4 south left');
  const after=p.windows.find(w=>w[0]===before[0]);
  close(after[3],before[3]);
  assert.equal(layout.serialize(JSON.parse(layout.serialize(edit))),layout.serialize(edit));
});
test('wall movement follows T-junctions and room bounds without scaling openings',()=>{
  const p=layout.resolve(baseline,layout.editWall(baseline,layout.empty(),'Bedroom 4 east',{x1:31.7,x2:31.7}));
  close(room(p,'Bedroom 4').w,12.85);
  close(wall(p,'Bedroom 4 south').x2,31.7);
  const a=wall(plan,'Bedroom 4 south').openings,b=wall(p,'Bedroom 4 south').openings;
  a.forEach((o,i)=>close(o[1]-o[0],b[i][1]-b[i][0]));
});
test('wall thickness and length remain physical data and cannot shorten through windows',()=>{
  const original=wall(plan,'Bedroom 3 west');
  const p=layout.resolve(baseline,layout.editWall(baseline,layout.empty(),original.name,{z2:53,thickness:.5}));
  close(wall(p,original.name).thickness,.5);
  close(p.windows.find(w=>w[0]==='Bedroom 3 west')[3],4);
  assert.throws(()=>layout.editWall(baseline,layout.empty(),original.name,{z2:42}),/too short/);
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
  assert.throws(()=>layout.editWall(baseline,layout.empty(),'Laundry west',{x1:6,x2:6}),/stair/);
});
test('proportional furniture anchors do not scale furniture and serialization does not mutate prior state',()=>{
  const before=JSON.stringify(baseline);
  const first=layout.editRoom(baseline,layout.empty(),'Bedroom 4',{w:13.5});
  const snapshot=layout.serialize(first);
  const p=layout.resolve(baseline,first),pos=layout.furniturePosition(baseline,p,24.95,45);
  close(pos.x,18.85+(24.95-18.85)*13.5/12.35);close(pos.z,45);
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
