'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const layout=require('../assets/js/upstairs-layout.js');
const upper=require('../assets/js/floor-plan-upstairs.js');
class Group{
  constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}};this.rotation={x:0,y:0,z:0};this.userData={};}
  add(c){this.children.push(c);c.parent=this;}
  updateMatrixWorld(){}
  getWorldPosition(v){v.y=0;for(let n=this;n;n=n.parent)v.y+=n.position.y;return v;}
  traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn));}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class BufferGeometry{constructor(){this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}setIndex(i){this.index=i;}computeVertexNormals(){}}
class Float32BufferAttribute{constructor(array,itemSize){Object.assign(this,{array,itemSize});}}
function build(edits=layout.empty()){
  const context={UpstairsLayout:layout,HomeRoof:require('../assets/js/floor-plan-roof.js')};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/floor-plan-upstairs.js'),'utf8'),context);
  const material={clone(){return {...this};}};
  const helpers={box(parent,x,y,z,w,h,d){const m=new Mesh({w,h,d},material);m.position.set(x,y,z);parent.add(m);return m;},
    mat:()=>material,wood:material,wallMaterial:material,windowTrim:material,oak:material,cream:material,black:material,steel:material,linen:material,windowFrame(){},openingCasing(){}};
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const doors={THREE:{Group},box:helpers.box,windowTrim:material};
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('),source.indexOf('  function shakerFront(')),doors);
  helpers.singlePanelDoor=doors.singlePanelDoor;
  const casing={THREE:{Group,Vector3:class{}},box:helpers.box,windowTrim:material,walls:[],casingSideWidth:3.5/12,casingReveal:.125/12};
  vm.runInNewContext(source.slice(source.indexOf('  function openingCasing('),source.indexOf('  const baseTrimSections')),casing);
  helpers.openingCasing=casing.openingCasing;
  return context.buildUpstairsModel({Group,Mesh,BufferGeometry,Float32BufferAttribute,DoubleSide:2,
    CylinderGeometry:class{constructor(top,bottom,length){this.length=length;}}},helpers,layout.stairOpening(),10,edits);
}
const model=build();
const item=n=>{const o=model.group.children.find(o=>o.name===`Upstairs ${n}`);assert.ok(o,`${n} exists`);return o;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function meshes(o){const out=[];o.traverse(m=>{if(m.geometry?.w!==undefined)out.push(m);});return out;}
function constituent(m){
  const {w,h,d}=m.geometry;let y=0;for(let n=m;n;n=n.parent)y+=n.position.y;
  const vertices=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>{
    for(let n=m;n;n=n.parent){const c=Math.cos(n.rotation.y),s=Math.sin(n.rotation.y);[x,z]=[n.position.x+c*x+s*z,n.position.z-s*x+c*z];}return [x,z];});
  return {vertices,low:y-h/2,high:y+h/2};
}
function bounds(o){
  const parts=meshes(o).map(constituent),v=parts.flatMap(p=>p.vertices);
  return {minX:Math.min(...v.map(p=>p[0])),maxX:Math.max(...v.map(p=>p[0])),minZ:Math.min(...v.map(p=>p[1])),maxZ:Math.max(...v.map(p=>p[1]))};
}
function overlap(a,b,t=.015){
  if(Math.min(a.high,b.high)-Math.max(a.low,b.low)<=t)return false;
  for(const v of [a.vertices,b.vertices])for(let i=0;i<4;i++){
    const p=v[i],q=v[(i+1)%4],ax=-(q[1]-p[1]),az=q[0]-p[0];
    const aa=a.vertices.map(([x,z])=>x*ax+z*az),bb=b.vertices.map(([x,z])=>x*ax+z*az);
    if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=t*Math.hypot(ax,az))return false;
  }return true;
}
test('bed mattress and actual frame sizes stay full size at all four approved placement tuples',()=>{
  for(const [n,x,z,r,w,d] of [['Primary',3.844166666666667,16.15,Math.PI/2,5,80/12],
    ['Bedroom 2',38.85,18.475,0,4.5,6.25],['Bedroom 3',3.6358333333333333,45.75,Math.PI/2,4.5,6.25],
    ['Bedroom 4',27.214166666666667,46.95,-Math.PI/2,4.5,6.25]]){
    const bed=item(`${n} bed`),m=bed.children.find(m=>m.name==='Bed mattress');
    close(bed.position.x,x);close(bed.position.z,z);close(bed.rotation.y,r);close(m.geometry.w,w);close(m.geometry.d,d);
    assert.ok(bed.children.some(m=>m.geometry.w===w+.2&&m.geometry.d===d+.2));
  }
});
test('all five independent full-size nightstands remain at the approved SVG locations',()=>{
  for(const [n,x,z] of [['Primary nightstand 1',1.375,12.3],['Primary nightstand 2',1.375,19.95],
    ['Bedroom 2 nightstand',42.275,16.25],['Bedroom 3 nightstand',1.375,49.1],['Bedroom 4 nightstand',29.275,50.5]]){
    const o=item(n);close(o.position.x,x);close(o.position.z,z);
    assert.ok(o.children.some(m=>m.geometry.w===1.55&&m.geometry.h===1.9&&m.geometry.d===1.5));
  }
});
test('four desks and chairs match full-size SVG footprints rather than shrinking for compact bedrooms',()=>{
  for(const [n,x,z,r,cx,cz] of [['Primary',8.8,7.85,0,8.8,9.9],['Bedroom 2',38.25,25.45,Math.PI,38.25,23.3],
    ['Bedroom 3',10.5,50.85,Math.PI,10.5,48.8],['Bedroom 4',19.9,46.9,Math.PI/2,21.9,47.05]]){
    const d=item(`${n} writing desk`),chair=item(`${n} desk chair`);
    close(d.position.x,x);close(d.position.z,z);close(d.rotation.y,r);
    close(chair.position.x,cx);close(chair.position.z,cz);
    assert.ok(d.children.some(m=>m.geometry.w===4&&m.geometry.d===1.8));
    assert.ok(chair.children.some(m=>m.geometry.w===1.65&&m.geometry.d===1.65),'Retain the full-size existing chair proxy');
  }
});
test('five full-size reading seats and primary media composition remain; no loft rugs or bedroom dressers',()=>{
  for(const n of ['Primary sitting chair 1','Primary sitting chair 2','Bedroom 2 reading chair','Bedroom 3 reading chair','Bedroom 4 reading chair']){
    const o=item(n),b=bounds(o);close(b.maxX-b.minX,2.35);close(b.maxZ-b.minZ,2.25);
  }
  item('Primary sitting side table');item('Primary media console');item('Primary wall TV');
  assert.ok(!model.group.children.some(o=>/Loft|rug|dresser/i.test(o.name)));
});
test('primary closet retains every full-size storage unit with a bedroom entry and separate bath entry',()=>{
  for(const [n,width] of [['Primary closet long hanging',5],['Primary closet double hanging',5],['Primary closet return hanging',5]]){
    const o=item(n);assert.ok(o.children.some(m=>m.geometry.w===width&&m.geometry.d===2));
  }
  item('Primary closet east return shelves');item('Primary closet folded clothes');item('Primary closet drawers');
  const door=model.plan.walls.find(w=>w.name==='Bath south');assert.equal(door.openings.length,1);
  assert.equal(model.plan.walls.find(w=>w.name==='Primary closet south').openings.length,0);
});
test('child closets retain 5-ft hanging runs and full shelf runs in the reduced front envelope',()=>{
  for(const n of ['Bedroom 3','Bedroom 4'])assert.ok(item(`${n} closet hanging`).children.some(m=>m.geometry.w===5&&m.geometry.d===2));
  assert.ok(item('Bedroom 4 closet shelves').children.some(m=>m.geometry.w===3.3&&m.geometry.d===1.3));
  const b=bounds(item('Bedroom 4 closet shelves'));assert.ok(b.maxZ<51.8-.175);
});
test('four bathrooms retain standard vanity widths and full shower/tub dimensions',()=>{
  for(const [n,width,x,z] of [['Primary north vanity',5,22.45,15.65],['Primary south vanity',4,17.75,15.65],
    ['Bedroom 2 vanity',3,36.5,7.9],['West bath vanity',3,1.85,36.35],['East bath vanity',3,30,36.35]]){
    const o=item(n);close(o.position.x,x);close(o.position.z,z);assert.ok(o.children.some(m=>m.userData.cabinetBody&&m.geometry.w===width));
  }
  for(const [n,w,d] of [['Primary shower',3.5,6],['Bedroom 2 shower',3,5],['West bath shower',3,5],['East bath shower',3,5]]){
    const o=item(n);assert.ok(o.children.some(m=>m.geometry.w===w&&m.geometry.d===d&&m.geometry.h===.24));
  }
  assert.ok(item('Primary freestanding tub').children.some(m=>m.geometry.w===2.8&&m.geometry.d===5.2));
});
test('owner rear datum is implemented with full-size side-by-side wet fixtures inside the new bath',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  close(g.north,6.65);
  const bath=model.plan.rooms.find(r=>r.name==='Primary bath');
  const alignedNorth=g.north+g.t/2, south=bath.z+bath.d-g.t/2;
  close(south-alignedNorth,9.8);
  close(g.north-.15,6.5);
  const entry=model.plan.walls.find(w=>w.name==='Primary suite entry').openings[0];
  close(g.bathNorth,g.north);
  close(g.north+entry[0],18.85);
  for(const name of ['Bedroom 2 bath','Bedroom 2 closet']){
    close(model.plan.rooms.find(r=>r.name===name).z,g.north);
  }
  // Constituent world transforms, not a fixture label or whole-group empty
  // volume. Keeping the tub where it is loses it outside the proposed shell.
  const tub=item('Primary freestanding tub'), b=bounds(tub);
  assert.ok(b.minZ>=alignedNorth&&b.maxZ<south&&b.minX>g.toiletEast);
  const shower=bounds(item('Primary shower'));
  close(tub.position.x,21.025);
  close((shower.minX-b.maxX)*12,4.5);
  close((b.minX-(g.toiletEast+g.t/2))*12,4.5);
  for(const m of meshes(tub))for(const s of meshes(item('Primary shower')))
    assert.ok(!overlap(constituent(m),constituent(s)));
});
test('implemented rear alignment measures its area without applying unrelated Version H changes',()=>{
  const {getLivableFloorArea,getGroundFloorDefaultPlan}=require('../assets/js/floor-plan-ground.js');
  const g=upper.getUpstairsMeasuredGeometry(), before=JSON.stringify(model.plan);
  const gross=p=>getLivableFloorArea({...p,floors:[...p.floors,model.baseline.arrival],stairs:model.baseline.stairs},{includeStairs:true});
  close(gross(model.plan),1892.5041666666667);
  close(1985.7791666666667-gross(model.plan),93.275);
  close(gross(model.plan)+getLivableFloorArea(getGroundFloorDefaultPlan(),{includeStairs:true}),3858.946875);
  assert.equal(JSON.stringify(model.plan),before);
});
test('replanned suite constituents clear walls trim handles and one another without hiding retained contents',()=>{
  const fixtures=model.group.children.filter(o=>/^Upstairs Primary (closet|freestanding|shower|toilet|north vanity|south vanity)/.test(o.name));
  const walls=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')).flatMap(o=>o.children.filter(m=>m.name==='Upstairs partition'||m.name==='Upstairs white baseboard'));
  for(const o of fixtures)for(const m of meshes(o))for(const w of walls)
    assert.ok(!overlap(constituent(m),constituent(w),.001),`${o.name} hits ${w.parent.name}/${w.name}`);
  for(let i=0;i<fixtures.length;i++)for(let j=0;j<i;j++)for(const a of meshes(fixtures[i]))for(const b of meshes(fixtures[j]))
    assert.ok(!overlap(constituent(a),constituent(b),.001),`${fixtures[i].name} hits ${fixtures[j].name}`);
  // Includes faucet projections, hanging side panels, drawer handles and baseboard.
  close((bounds(item('Primary north vanity')).minZ-bounds(item('Primary freestanding tub')).maxZ)*12,30.6);
  const wcWall=model.group.children.find(o=>o.name==='Upstairs wall: Toilet south');
  const wcCasing=wcWall.children.find(o=>o.userData.side===1);
  const wcLeg=wcCasing.children.find(o=>o.name==='White casing side board');
  close((bounds(item('Primary south vanity')).minZ-bounds(wcLeg).maxZ)*12,29.25);
  close((bounds(item('Primary closet return hanging')).minZ-bounds(item('Primary closet double hanging')).maxZ)*12,26.4);
  close((bounds(item('Primary closet return hanging')).minX-bounds(item('Primary closet drawers')).maxX)*12,40.56);
  close((18.45-.175-(15.1+.175)-2*.0625)*12,34.5);
});
test('all room leaves including WC bath and relocated suite entry clear the full retained suite through 465 poses',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});
  const retained=model.group.children.filter(o=>/^Upstairs Primary /.test(o.name)).flatMap(meshes);
  const conflicts=new Set();
  for(const d of doors){
    const closed=d.rotation.y;
    try{for(let a=0;a<=90;a+=3){
      d.rotation.y=closed+a*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
      for(const m of meshes(d))for(const f of retained)if(overlap(constituent(m),constituent(f),.001))conflicts.add(`${d.parent.name} / ${f.parent.name}`);
    }}finally{d.rotation.y=closed;}
  }
  assert.deepEqual([...conflicts],[]);
});
test('retained vanity fronts and closet drawers operate individually without fixture collisions and restore their defaults',()=>{
  const vanities=['Primary north vanity','Primary south vanity'].map(item);
  const obstacles=['Primary freestanding tub','Primary shower','Primary toilet'].map(item).flatMap(meshes);
  let poses=0;
  for(const v of vanities)for(const f of v.children.filter(m=>m.userData.cabinetFront)){
    const x=f.position.x,rotation=f.rotation.y,w=f.geometry.w,side=f.userData.hingeSide;
    try{for(let a=0;a<=90;a+=3){
      const angle=side*a*Math.PI/180;
      f.rotation.y=angle;f.position.x=x+side*w/2-side*w/2*Math.cos(angle);
      f.position.z=.935+side*w/2*Math.sin(angle);
      for(const m of meshes(f))for(const o of obstacles)assert.ok(!overlap(constituent(m),constituent(o),.001));
      poses++;
    }}finally{f.position.x=x;f.position.z=.935;f.rotation.y=rotation;}
  }
  const drawers=item('Primary closet drawers');
  for(const f of drawers.children.filter(m=>m.userData.cabinetFront)){
    const z=f.position.z;
    try{for(let t=0;t<=1.2+.001;t+=.04){
      f.position.z=z+t;
      for(const m of meshes(f))for(const o of ['Primary closet long hanging','Primary closet double hanging','Primary closet return hanging','Primary closet folded clothes'].map(item).flatMap(meshes))
        assert.ok(!overlap(constituent(m),constituent(o),.001));
      poses++;
    }}finally{f.position.z=z;}
  }
  assert.equal(poses,341,'Seven vanity leaves and four drawers, 31 samples each');
  // Closed routes above are not simultaneous open-front passing approval.
  close((bounds(item('Primary closet double hanging')).maxZ),18.975);
});
test('swapped Bath 2 and Closet 2 fixtures stay in their actual distinct rooms and do not overlap',()=>{
  const t=bounds(item('Bedroom 2 toilet')),v=bounds(item('Bedroom 2 vanity'));
  assert.ok(t.minX>v.maxX,'Side-by-side north fixtures, not old opposing layout');
  for(const n of ['Bedroom 2 toilet','Bedroom 2 vanity','Bedroom 2 shower']){
    const b=bounds(item(n));assert.ok(b.minX>=34.65+.175-1e-8&&b.maxX<=44-.175+.001&&b.minZ>=6.65+.175-1e-8&&b.maxZ<=12-.175+.001,n);
  }
});
test('laundry machines face west and retained standard bases have separate continuous countertops',()=>{
  for(const [n,z] of [['Washer',30.55],['Dryer',33.425]]){
    const o=item(n);close(o.position.x,42.2);close(o.position.z,z);close(o.rotation.y,-Math.PI/2);
    assert.ok(o.children.some(m=>m.geometry.w===2.8&&m.geometry.d===2.8));
  }
  const north=item('Laundry folding counter'),south=item('Laundry south bases');
  const bases=o=>o.children.filter(m=>m.userData.cabinetBody).map(m=>m.geometry.w);
  assert.deepEqual(bases(north),[2,3,3,2]);assert.deepEqual(bases(south),[2,2,2]);
  const n=bounds(north.children.find(m=>m.name==='North laundry countertop to west wall'));
  const s=bounds(south.children.find(m=>m.name==='South laundry countertop to west wall'));
  close(n.minX,30.4);close(s.minX,30.4);close((s.minZ-n.maxZ)*12,45.3);
  item('Laundry wall cupboards');
  const mech=item('Mechanical equipment reservation');close(mech.position.x,39.3);close(mech.position.z,38.9);
});
test('wall lamps are backed by solid paint faces clear of all windows and doors',()=>{
  for(const lamp of model.group.children.filter(o=>o.userData.wallMounted)){
    const {x,z}=lamp.position;
    const host=model.plan.walls.find(w=>{
      const vert=Math.abs(w.x1-w.x2)<.001,along=vert?z-w.z1:x-w.x1;
      return Math.abs((vert?x:z)-(vert?w.x1:w.z1))<.3&&along>0&&along<Math.hypot(w.x2-w.x1,w.z2-w.z1);
    });
    assert.ok(host,lamp.name);
    const along=Math.abs(host.x1-host.x2)<.001?z-host.z1:x-host.x1;
    assert.ok(host.openings.every(([a,b,low,high])=>high<4.9||low>5.6||along+.28<=a||along-.28>=b),lamp.name);
  }
});
test('full-size bedroom furniture constituent meshes do not penetrate partition bodies',()=>{
  const walls=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')).flatMap(o=>o.children.filter(m=>m.name==='Upstairs partition'));
  for(const o of model.group.children.filter(o=>o.userData.viewerFurniture)){
    for(const m of meshes(o))for(const w of walls)assert.ok(!overlap(constituent(m),constituent(w)),`${o.name}/${m.name} hits ${w.parent.name}`);
  }
});
test('fixed stair retains only exposed east guard and a single flush 44-inch arrival mesh',()=>{
  const guards=model.group.children.filter(o=>o.name==='Upstairs Stair opening guard');assert.equal(guards.length,1);
  const arrival=model.group.children.filter(o=>o.name==='Upstairs floor: Stair arrival');assert.equal(arrival.length,1);
  close(arrival[0].geometry.w*12,44);close(arrival[0].geometry.d*12,46.9);
  close(model.group.position.y+arrival[0].position.y+arrival[0].geometry.h/2,10);
  const g=bounds(guards[0]);close(g.minX,layout.stairOpening().x+layout.stairOpening().width-.04);
});
test('all 15 door leaves start closed at eight-foot openings and retain single recessed fields',()=>{
  const leaves=[];model.group.traverse(o=>{if(o.userData.doorStyle==='Single recessed panel')leaves.push(o);});
  assert.equal(leaves.length,15);
  for(const o of leaves){assert.equal(o.userData.height,7.96);assert.equal(o.parent.userData.interactiveHouseDoor.openAngleDegrees,0);
    assert.equal(o.parent.userData.interactiveHouseDoor.maxAngleDegrees,90);
    assert.equal(o.children.filter(m=>m.name==='Interior door single recessed field').length,1);}
});
test('door motion sampling restores every approved closed pose and exposes operation conflicts rather than hiding them',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});
  const furniture=model.group.children.filter(o=>/writing desk|desk chair|nightstand|equipment reservation|vanity/.test(o.name)).flatMap(meshes);
  let samples=0;
  const conflicts=new Set();
  for(const d of doors){
    const closed=d.rotation.y;
    for(let a=0;a<=90;a+=3){
      d.rotation.y=closed+a*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
      for(const m of meshes(d))for(const f of furniture)if(overlap(constituent(m),constituent(f)))conflicts.add(d.parent.name);
      samples++;
    }
    d.rotation.y=closed;close(d.rotation.y,d.userData.interactiveHouseDoor.closedRotationY);
  }
  assert.equal(samples,465);
  // The SVG is explicitly a reversible fit study, not an all-open operating
  // approval. Keep exact doors/furniture; assert the viewer carries that limit.
  const html=fs.readFileSync(require.resolve('../floor-plan-3d.html'),'utf8');
  assert.match(html,/simultaneous door|door and appliance operation/i);
  assert.deepEqual([...conflicts],[],'Every sampled room leaf clears retained desks chairs nightstands vanities and mechanical proxy');
});
test('floor changes restore arrival, furniture placements and visibility without changing saved data',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const object=()=>({visible:true}),element=()=>({setAttribute(){},closest:()=>({})});
  const state={upstairs:model,stairs:object(),basementStairs:object(),upstairsStairParts:[],activeFloor:'ground',groundVisibility:new Map(),
    groundModelRoots:[],frontPorchChairs:[],groundLayoutPreview:null,exterior:object(),tourMapBounds:{},tourMap:{width:200,setAttribute(){}},
    viewport:element(),islandLightsInput:element(),navigationMode:'rotate',document:{getElementById:element,querySelector:element,querySelectorAll:()=>[]},
    floorAreas:()=>model.areas};
  vm.runInNewContext(source.slice(source.indexOf('  function selectFloor(floor) {'),source.indexOf('  function refreshUpstairsDimensions() {')),state);
  const tuples=()=>model.group.children.map(o=>[o.name,o.position.x,o.position.z,o.rotation.y,o.children.length]);
  const before=tuples(),saved=fs.readFileSync(require.resolve('../assets/data/upstairs-layout.json'),'utf8');
  for(const f of ['upstairs','ground','exterior','upstairs']){state.selectFloor(f);assert.equal(model.group.visible,f==='upstairs');assert.deepEqual(tuples(),before);}
  assert.equal(fs.readFileSync(require.resolve('../assets/data/upstairs-layout.json'),'utf8'),saved);
});
test('closet inspection hides canopy shelves and other views restore them without moving storage',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const start=source.indexOf('    upstairs.group.traverse((object) => {',source.indexOf('  function setView(name)'));
  const end=source.indexOf('    const planView',start),canopies=[];
  model.group.traverse(o=>{if(o.userData.closetCanopy)canopies.push(o);});
  assert.equal(canopies.length,6);
  for(const name of ['upstairs-primary-closet','upstairs','whole','upstairs-bedroom-2-closet','upstairs-top']){
    vm.runInNewContext(source.slice(start,end),{upstairs:model,name});
    assert.ok(canopies.every(o=>o.visible===!name.includes('closet')));
  }
});
test('real door click handler invalidates tour collisions after operation',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const hinge=item('wall: Bedroom 3 north').children.find(o=>o.userData.interactiveHouseDoor);
  let selected=hinge.children[0],rebuilds=0;
  for(let n=selected;n;n=n.parent)n.visible=true;
  const context={activeFloor:'upstairs',groundLayoutPreview:null,visiblePickTargets:()=>[],
    renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})}},scene:{children:[],updateMatrixWorld(){}},camera:{updateMatrixWorld(){}},
    THREE:{Vector2:class{},Raycaster:class{setFromCamera(){}intersectObjects(){return [{object:selected}];}},MathUtils:{degToRad:d=>d*Math.PI/180}},
    buildWalkObstacles(){rebuilds++;},render(){},toggleCabinet(){}};
  vm.runInNewContext(source.slice(source.indexOf('  function pickHouseDoor('),source.indexOf('  const charger = furnishing(')),context);
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);assert.equal(rebuilds,1);
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);assert.equal(rebuilds,2);
  close(hinge.rotation.y,hinge.userData.interactiveHouseDoor.closedRotationY);
});
test('one gallery viewing position has uninterrupted sightlines to all four approved bedroom entries',()=>{
  const walls=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')).flatMap(o=>o.children.filter(m=>m.name==='Upstairs partition'));
  for(const [tx,tz] of [[15.1,25.1],[29,25.05],[11.175,40.45],[20.475,40.45]]){
    for(let i=0;i<99;i++){
      const x=22+(tx-22)*i/100,z=29+(tz-29)*i/100;
      for(const w of walls){
        const b=bounds(w),c=constituent(w);
        assert.ok(!(x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&c.low<15.2&&c.high>15.2),`Blocked gallery sightline to ${tx},${tz} by ${w.parent.name}`);
      }
    }
  }
});
test('12-inch avatar reaches all rooms and a continuous 24-inch disk reaches the entire replanned suite',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});
  // Keep the exact Bath 2 opening and closed pose; its coordinated inward
  // swing replaces the SVG's outward arc beside the full-size bed head.
  for(const d of doors)d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+
    Math.PI/2*d.userData.interactiveHouseDoor.openRotationSign;
  const floors=model.areas;
  const obstacles=meshes(model.group).map(constituent).filter(b=>b.high>10.5&&b.low<15.5);
  for(const n of ['West bath shower','East bath shower','Bedroom 2 shower','Primary shower']){
    const b=bounds(item(n));obstacles.push({vertices:[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]]});
  }
  let radius=.5;
  const blocked=(x,z,p)=>{
    const v=p.vertices;
    if(x<Math.min(...v.map(v=>v[0]))-radius||x>Math.max(...v.map(v=>v[0]))+radius||
      z<Math.min(...v.map(v=>v[1]))-radius||z>Math.max(...v.map(v=>v[1]))+radius)return false;
    const crosses=[];
    for(let i=0;i<4;i++){
      const [ax,az]=v[i],[bx,bz]=v[(i+1)%4],dx=bx-ax,dz=bz-az;
      crosses.push(dx*(z-az)-dz*(x-ax));
      const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
      if(Math.hypot(x-ax-t*dx,z-az-t*dz)<radius-.001)return true;
    }
    return crosses.every(c=>c>=0)||crosses.every(c=>c<=0);
  };
  const inside=(x,z)=>floors.some(f=>x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d);
  const can=(x,z)=>[[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]].every(([dx,dz])=>inside(x+dx,z+dz))&&
    !obstacles.some(b=>blocked(x,z,b));
  function flood(start=[16.625,33.125]){
  const queue=[start],visited=new Set([`${start[0]*4},${start[1]*4}`]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const a=x+dx,b=z+dz,k=`${a*4},${b*4}`;
      if(a<0||a>44||b<0||b>53||visited.has(k)||!can(a,b))continue;
      visited.add(k);queue.push([a,b]);
    }
  }
  return queue;
  }
  const queue=flood();
  const destinations={'primary bedroom':[11,22.5],'primary bath':[24.25,12],'primary WC':[17,10.5],
    'primary closet':[22,20],'bedroom 2':[35,18],'Bath 2':[39,10.5],'Closet 2':[31,10.5],
    'bedroom 3':[8,45],'Closet 3':[15,43],'bedroom 4':[22.5,42.5],'Closet 4':[17.75,50],
    'Bath 3 approach':[4.75,39],'Bath 4 approach':[29,39.5],laundry:[38,30.75],mechanical:[41.5,37]};
  const missing=Object.entries(destinations).filter(([,p])=>!queue.some(([x,z])=>Math.hypot(x-p[0],z-p[1])<.2)).map(([n])=>n);
  try{
    assert.deepEqual(missing,[],'Model-avatar connectivity is not occupied or simultaneous-use approval');
    assert.ok(queue.length>3000);
    radius=1;
    const wider=flood();
    for(const [name,p] of Object.entries({'primary bedroom':[11,22.5],'primary closet':[22,20],'primary bath':[24.25,12.5],'WC approach':[16.875,10.5],'linen retrieval':[23.125,24.125]}))
      assert.ok(wider.some(([x,z])=>Math.hypot(x-p[0],z-p[1])<.2),`Continuous 24-inch disk route to ${name}, not a code/person standard`);
  }finally{for(const d of doors)d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY;}
});
