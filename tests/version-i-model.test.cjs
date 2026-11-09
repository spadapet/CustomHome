'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const upper=require('../assets/js/floor-plan-upstairs.js');
const layout=require('../assets/js/upstairs-layout.js');
const baseline=upper.getUpstairsDefaultPlan(layout.stairOpening());
const plan=layout.resolve(baseline,layout.empty());
const svg=fs.readFileSync(require.resolve('../assets/images/plans/upstairs-2000/version-i.svg'),'utf8');
const close=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b} feet`);
const attrs=text=>Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const floorGroup=svg.match(/<g id="upstairs-floors">([\s\S]*?)<\/g>/)[1];
const traced=[...floorGroup.matchAll(/<rect\s+([^>]+)>/g)].map(m=>attrs(m[1])).map(a=>({name:a['data-room'],x:+a.x,z:+a.y,w:+a.width,d:+a.height}));
const map={'Primary':'Primary bedroom','Closet 2':'Bedroom 2 closet','Bath 2':'Bedroom 2 bath','Bath 3':'Shared bath west',
  'Bath 4':'Shared bath east','Closet 3':'Bedroom 3 closet','Closet 4':'Bedroom 4 closet','Furnace':'Mechanical (relocated)','Laundry':'Laundry (relocated)'};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z));
function unionArea(rectangles){
  const xs=[...new Set(rectangles.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b);let area=0;
  for(let i=1;i<xs.length;i++){
    const spans=rectangles.filter(r=>r.x<xs[i]&&r.x+r.w>xs[i-1]).map(r=>[r.z,r.z+r.d]).sort((a,b)=>a[0]-b[0]);let end=-Infinity;
    for(const [start,stop] of spans){area+=(xs[i]-xs[i-1])*Math.max(0,stop-Math.max(start,end));end=Math.max(end,stop);}
  }return area;
}
test('unique room inventory and exterior outline follow Version I rather than H attic/recess',()=>{
  assert.equal(new Set(plan.rooms.map(r=>r.name)).size,plan.rooms.length);
  const g=upper.getUpstairsMeasuredGeometry();
  for(const [key,value] of Object.entries({bedEast:43.869048,east:55.916667,serviceEast:55.916667,bedNorth:41.578571,southEast:32.017857,south:55.066667,north:7.4,
    primarySouth:27.763095,serviceNorth:36.144048,serviceSouth:41.578571,laundryNorth:33.459524,laundryWest:42.559524,laundryNotchEast:43.869048,laundryNotchSouth:36.144048,loftNorth:19.775,loftWest:43.869048}))close(g[key],value);
  assert.ok(!Object.keys(g).some(k=>/^attic/i.test(k)));
  const special=new Set(['Stairs','Bedroom 2','Bath 2','Laundry','Hallway']);
  for(const r of traced.filter(r=>!special.has(r.name))){
    const actual=plan.rooms.find(a=>a.name===(map[r.name]||r.name));assert.ok(actual,r.name);
    const footprint=actual.tracedFootprint||actual;for(const k of ['x','z','w','d'])close(footprint[k],r[k]);
  }
  const bath=plan.rooms.find(r=>r.name==='Bedroom 2 bath'),source=traced.find(r=>r.name==='Bath 2');
  close(bath.x,source.x);close(bath.z,source.z);close(bath.w,source.w);close(bath.d-source.d,.982142);
});
test('all eighteen SVG window apertures have exact coordinates, host cuts and 36/96-inch sill/head',()=>{
  const windowGroup=svg.match(/<g id="upstairs-windows"[^>]*>([\s\S]*?)<\/g>/)[1];
  const windows=[...windowGroup.matchAll(/<path data-window="([^>]+)>/g)].map(m=>attrs('data-window="'+m[1]));
  assert.equal(windows.length,18);assert.equal(plan.windows.length,18);
  let units=0;
  for(const w of windows){
    const tuple=plan.windows.find(a=>a[0]===w['data-window']);assert.ok(tuple,w['data-window']);
    const numbers=[...w.d.matchAll(/-?(?:\d+(?:\.\d*)?|\.\d+)/g)].map(m=>+m[0]);
    const vertical=w.d.includes('V'),center=(numbers[vertical?1:0]+numbers[2])/2;
    close(tuple[3],+w['data-width-inches']/12);close(tuple[vertical?2:1],center);
    const normal=vertical?numbers[0]:numbers[1];assert.ok(Math.abs(tuple[vertical?1:2]-normal)<.101);
    const wall=plan.walls.find(host=>{
      const hostVertical=Math.abs(host.x1-host.x2)<1e-6;if(hostVertical!==vertical)return false;
      const along=vertical?tuple[2]-host.z1:tuple[1]-host.x1;
      return Math.abs((vertical?host.x1:host.z1)-normal)<1e-6&&host.openings.some(o=>o[2]===3&&o[3]===8&&Math.abs((o[0]+o[1])/2-along)<1e-6&&Math.abs(o[1]-o[0]-tuple[3])<1e-6);
    });assert.ok(wall,w['data-window']+' has correct full exterior aperture');units+=+w['data-units'];
  }
  assert.equal(units,28);assert.equal(upper.getUpstairsSideWindows().length,16);
  const fronts=upper.getUpstairsFrontWindows();assert.equal(fronts.length,4);assert.equal(new Set(fronts.map(w=>w.openingId)).size,2);
  for(let i=0;i<4;i+=2){close(fronts[i].width,2.5);close(fronts[i+1].center-fronts[i].center,2.5);
    close((fronts[i].center+fronts[i+1].center)/2,plan.windows.find(w=>w[0]===fronts[i].openingId)[1]);}
});
test('registered floor union equals I outline less canonical stair, with single coverage of arrival',()=>{
  const floors=[...plan.floors,baseline.arrival],stair={x:baseline.stairs.x,z:baseline.stairs.z,w:baseline.stairs.width,d:baseline.stairs.depth};
  for(const f of floors)assert.ok(overlap(f,stair)<1e-6,f.name+' must not bridge the stair');
  for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++)assert.ok(overlap(floors[i],floors[j])<1e-6,`${floors[i].name}/${floors[j].name}`);
  const tracedUnion=unionArea(traced);close(unionArea(floors),tracedUnion-stair.w*stair.d);
  close(baseline.arrival.w*12,44);close(baseline.arrival.d*12,46.9);
  const cut=baseline.registrationException;close(cut.primaryNotchNorth+.175,stair.z);close(cut.primaryTracedSouth,27.763095);
  assert.ok(cut.primaryTracedSouth>stair.z);assert.ok(cut.stairTraceEast>baseline.arrival.x&&cut.stairTraceEast<baseline.arrival.x+baseline.arrival.w);
});
test('I openings include explicit owner and finished-jamb corrections plus new WC and furnace access',()=>{
  const group=svg.match(/<g id="upstairs-doors"[^>]*>([\s\S]*?)<\/g>/)[1];
  const symbols=[...group.matchAll(/<path data-door="([^>]+)>/g)].map(m=>attrs('data-door="'+m[1]));
  assert.equal(symbols.length,14);
  const doorWalls={'Primary entry':'Primary south','Primary bath':'Primary suite entry','Primary closet':'Bath south','Bedroom 2 entry':'Bedroom 2 south',
    'Closet 2':'Closet 2 south','Bath 2':'Bath 2 south','Linen':'Linen east','Bath 3':'Bedroom 3 north','Bedroom 3 entry':'Bedroom 3 entry',
    'Closet 4':'Bedroom 4 closet','Bedroom 4 entry':'Bedroom 4 entry','Closet 3':'Bedroom 4 north','Bath 4':'Bedroom 4 north','Laundry':'Laundry north'};
  const corrections={'Primary entry':11.934524,'Primary bath':13.15,'Primary closet':20.654762,'Bedroom 2 entry':29.892857,
    'Closet 2':31.315476,'Bath 2':37.2,'Bath 3':.625,'Bedroom 3 entry':42.203571,'Closet 4':51.941667,
    'Bedroom 4 entry':42.203571,'Closet 3':24.172619,'Bath 4':27.672619,'Laundry':44.494048,'Linen':37.5};
  for(const d of symbols.filter(d=>!(d['data-door'] in corrections))){
    const values=[...d.d.matchAll(/-?(?:\d+(?:\.\d*)?|\.\d+)/g)].map(m=>+m[0]),x=values[0],z=values[1];
    const w=plan.walls.find(w=>w.name===doorWalls[d['data-door']]);assert.ok(w,d['data-door']);
    const vertical=Math.abs(w.x1-w.x2)<1e-6;close(vertical?w.x1:w.z1,vertical?x:z);
    const along=vertical?z-w.z1:x-w.x1;assert.ok(w.openings.some(o=>o[2]===0&&(Math.abs(o[0]-along)<2e-6||Math.abs(o[1]-along)<2e-6)),d['data-door']);
  }
  for(const [name,start] of Object.entries(corrections)){
    const wall=plan.walls.find(w=>w.name===doorWalls[name]),vertical=Math.abs(wall.x1-wall.x2)<1e-6;
    assert.ok(wall.openings.some(o=>o[2]===0&&Math.abs((vertical?wall.z1:wall.x1)+o[0]-start)<2e-6),name+' corrected start');
  }
  const primary=plan.walls.find(w=>w.name==='Primary south');close(primary.z1+.175,baseline.stairs.z);
  const bath=plan.walls.find(w=>w.name==='Bath 2 south');close(bath.z1,12.834523);close(bath.x1+bath.openings[0][0],37.2);
  const wc=plan.walls.find(w=>w.name==='Primary WC east');assert.equal(wc.openings.length,1);close(wc.openings[0][3],8);
  const furnace=plan.walls.find(w=>w.name==='East bath north').openings.find(o=>o[2]===0);close(furnace[1]-furnace[0],3);close(furnace[3],8);
  assert.equal(plan.walls.flatMap(w=>w.openings.filter(o=>o[2]===0)).length,16);
});
