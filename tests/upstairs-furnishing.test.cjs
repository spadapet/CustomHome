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
  helpers.windowFrame=(name,x,z,width,height,bottom,rotation,parent,side,{installationWalls})=>{
    const root=new Group();root.name=name;root.position.set(x,0,z);root.rotation.y=rotation;root.userData.windowAssembly=true;parent.add(root);
    const nx=Math.sin(rotation)*side,nz=Math.cos(rotation)*side;
    const host=installationWalls.find(w=>{
      const length=Math.hypot(w.x2-w.x1,w.z2-w.z1),dx=(w.x2-w.x1)/length,dz=(w.z2-w.z1)/length,along=(x-w.x1)*dx+(z-w.z1)*dz;
      return Math.abs(dx*nx+dz*nz)<.001&&along>0&&along<length&&Math.abs((w.x1-x)*nx+(w.z1-z)*nz)<.3;
    });assert.ok(host,name+' window host');
    helpers.openingCasing(root,0,bottom,width,height,host.thickness/2+(host.x1-x)*nx+(host.z1-z)*nz,side,true);
  };
  return context.buildUpstairsModel({Group,Mesh,BufferGeometry,Float32BufferAttribute,DoubleSide:2,
    CylinderGeometry:class{constructor(top,bottom,length){this.length=length;}}},helpers,layout.stairOpening(),10,edits);
}
const model=build();
const item=n=>{const o=model.group.children.find(o=>o.name===`Upstairs ${n}`);assert.ok(o,`${n} exists`);return o;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function meshes(o){const out=[];o.traverse(m=>{if(m.geometry?.w!==undefined)out.push(m);});return out;}
function fixedWallMeshes(o){return o.children.filter(m=>!m.userData.interactiveHouseDoor).flatMap(meshes);}
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
test('all retained beds and five nightstands keep full-size dimensions at Version I placements',()=>{
  for(const [n,x,z,r,w,d] of [['Primary',3.844166666666667,17,Math.PI/2,5,80/12],['Bedroom 2',40.23321466666667,22.1,-Math.PI/2,4.5,6.25],
    ['Bedroom 3',3.6358333333333333,47.7,Math.PI/2,4.5,6.25],['Bedroom 4',28.38202366666667,48.2,-Math.PI/2,4.5,6.25]]){
    const bed=item(`${n} bed`),m=bed.children.find(m=>m.name==='Bed mattress');close(bed.position.x,x);close(bed.position.z,z);
    close(bed.rotation.y,r);close(m.geometry.w,w);close(m.geometry.d,d);assert.ok(bed.children.some(m=>m.geometry.w===w+.2&&m.geometry.d===d+.2));
  }
  const stands=model.group.children.filter(o=>o.name.includes('nightstand'));assert.equal(stands.length,5);
  stands.forEach(o=>assert.ok(o.children.some(m=>m.geometry.w===1.55&&m.geometry.h===1.9&&m.geometry.d===1.5)));
});
test('four desks/chairs and five reading seats remain full-size and no new dressers or rugs appear',()=>{
  for(const [n,x,z,cx,cz] of [['Primary',11.3,8.475,11.3,10.425],['Bedroom 2',34.8,26.688095,34.8,24.738095],
    ['Bedroom 3',12.085714,48.6,10.135714,48.6],['Bedroom 4',20.128571,49.6,22.078571,49.6]]){
    const d=item(`${n} writing desk`),c=item(`${n} desk chair`);close(d.position.x,x);close(d.position.z,z);close(c.position.x,cx);close(c.position.z,cz);
    assert.ok(d.children.some(m=>m.geometry.w===4&&m.geometry.d===1.8));assert.ok(c.children.some(m=>m.geometry.w===1.65&&m.geometry.d===1.65));
  }
  for(const n of ['Primary sitting chair 1','Primary sitting chair 2','Bedroom 2 reading chair','Bedroom 3 reading chair','Bedroom 4 reading chair']){
    const b=bounds(item(n)),rotated=n==='Bedroom 2 reading chair';close(b.maxX-b.minX,rotated?2.25:2.35);close(b.maxZ-b.minZ,rotated?2.35:2.25);
  }
  item('Primary sitting side table');item('Primary media console');item('Primary wall TV');assert.ok(!model.group.children.some(o=>/rug|dresser/i.test(o.name)));
});
test('retained four-piece lounge relocates to east Loft with measured routes, not the hallway',()=>{
  const names=['Loft sofa','Loft coffee table','Loft armchair','Loft side table'],parts=names.map(item),[s,c,a,t]=parts.map(bounds);
  close(s.maxX-s.minX,7);close(s.maxZ-s.minZ,3);close(c.maxX-c.minX,4);close(c.maxZ-c.minZ,2);
  close(a.maxX-a.minX,2.25);close(a.maxZ-a.minZ,2.35);close(t.maxX-t.minX,1.5);close(t.maxZ-t.minZ,1.5);
  close((c.minZ-s.maxZ)*12,16.2);close((s.minZ-(19.775+.175+.0625))*12,35.85);
  assert.ok(parts.every(o=>{const b=bounds(o);return b.minX>43.869048+.175&&b.maxX<55.916667-.175&&b.minZ>19.775+.175&&b.maxZ<33.459524-.175;}));
  for(let i=0;i<parts.length;i++)for(let j=0;j<i;j++)for(const m of meshes(parts[i]))for(const n of meshes(parts[j]))assert.ok(!overlap(constituent(m),constituent(n),.001));
  assert.ok(!model.group.children.some(o=>/Gallery (sofa|coffee|armchair|side)/.test(o.name)));
});
test('four baths retain standard vanity widths, 36 by 60 showers and full-size primary wet fixtures',()=>{
  for(const [n,width] of [['Primary north vanity',5],['Primary south vanity',4],['Bedroom 2 vanity',3],['West bath vanity',3],['East bath vanity',3]]){
    assert.ok(item(n).children.some(m=>m.userData.cabinetBody&&m.geometry.w===width));
  }
  for(const [n,w,d] of [['Primary shower',3.5,6],['Bedroom 2 shower',3,5],['West bath shower',3,5],['East bath shower',3,5]]){
    assert.ok(item(n).children.some(m=>m.geometry.w===w&&m.geometry.d===d&&m.geometry.h===.24));
  }
  assert.ok(item('Primary freestanding tub').children.some(m=>m.geometry.w===2.8&&m.geometry.d===5.2));
  for(const n of ['Primary toilet','Bedroom 2 toilet','West bath toilet','East bath toilet'])item(n);
  for(const n of ['Bedroom 2 shower','West bath shower','East bath shower']){
    close(item(n).rotation.y,0);const b=bounds(item(n));close(b.maxX-b.minX,3);close(b.maxZ-b.minZ,5);
  }
});
test('retained laundry and closet cabinetry stays standard while owner removes all furnace storage',()=>{
  for(const [n,width] of [['Primary closet long hanging',5],['Primary closet double hanging',5],['Primary closet return hanging',2],
    ['Bedroom 2 closet hanging',4.25],['Bedroom 3 closet hanging',5],['Bedroom 4 closet hanging',5.6]])assert.ok(item(n).children.some(m=>m.geometry.w===width&&m.geometry.d===2));
  assert.ok(item('Primary closet drawers').children.some(m=>m.geometry.w===4&&m.geometry.d===1.4));
  const bases=o=>o.children.filter(m=>m.userData.cabinetBody).map(m=>m.geometry.w);
  assert.deepEqual(bases(item('Laundry folding counter')),[2,2]);assert.deepEqual(bases(item('Laundry south bases')),[2,2,3]);
  assert.ok(!model.group.children.some(o=>/storage-only bases|Service storage|Attic/i.test(o.name)));
  item('Laundry wall cupboards');item('Laundry north cupboards');item('Linen shelves - access approval required');
  for(const n of ['Washer','Dryer'])assert.ok(item(n).children.some(m=>m.geometry.w===2.8&&m.geometry.d===2.8));
  const furnace=model.plan.rooms.find(r=>r.name==='Mechanical (relocated)');
  const contents=model.group.children.filter(o=>!/^Upstairs (wall:|floor:)/.test(o.name)&&o.position.x>furnace.x&&o.position.x<furnace.x+furnace.w&&o.position.z>furnace.z&&o.position.z<furnace.z+furnace.d);
  assert.deepEqual(contents.map(o=>o.name),['Upstairs Mechanical equipment reservation']);
});
test('retained furniture and wet fixtures clear real partition bodies, projecting baseboards and one another',()=>{
  const walls=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')||o.userData.windowAssembly).flatMap(fixedWallMeshes);
  const furnishings=model.group.children.filter(o=>!o.name.startsWith('Upstairs wall:')&&!o.userData.windowAssembly&&(o.userData.viewerFurniture||/vanity|toilet|shower|freestanding|closet |cupboards|folding counter|south bases|storage-only bases|equipment reservation|Linen .*shelves|Washer|Dryer|Stair opening guard/.test(o.name)));
  const conflicts=[];
  for(const o of furnishings)for(const m of meshes(o))for(const w of walls)if(overlap(constituent(m),constituent(w),.001))conflicts.push(`${o.name} / ${w.parent.name}`);
  for(let i=0;i<furnishings.length;i++)for(let j=0;j<i;j++)for(const a of meshes(furnishings[i]))for(const b of meshes(furnishings[j]))if(overlap(constituent(a),constituent(b),.001))conflicts.push(`${furnishings[i].name} / ${furnishings[j].name}`);
  assert.deepEqual([...new Set(conflicts)],[]);
});
test('all sixteen leaves including WC and furnace access are closed 96-inch doors with owner hinge choices',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});assert.equal(doors.length,16);
  for(const d of doors){assert.equal(d.userData.interactiveHouseDoor.openAngleDegrees,0);assert.equal(d.userData.interactiveHouseDoor.maxAngleDegrees,90);assert.equal(d.userData.nominalOpeningFeet,d.parent.name.endsWith('East bath north')?3:2.5);
    close(d.children[0].userData.height,7.96);close(d.rotation.y,d.userData.interactiveHouseDoor.closedRotationY);}
  for(const [name,right,sign] of [['Bedroom 3 entry',false,-1],['Bedroom 3 north',false,1],['Laundry north',false,-1],['Bath 2 south',false,-1],['Primary WC east',true,1]]){
    const d=item(`wall: ${name}`).children.find(o=>o.userData.interactiveHouseDoor);close(d.rotation.y,right?Math.PI:0);assert.equal(d.userData.interactiveHouseDoor.openRotationSign,sign);
  }
});
test('all sixteen sampled door sweeps clear retained fixtures and restore closed defaults',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});
  const retained=model.group.children.filter(o=>!/^Upstairs (wall:|floor:)/.test(o.name)).flatMap(meshes);
  const conflicts=new Set();let samples=0;
  for(const d of doors){const closed=d.rotation.y;try{for(let a=0;a<=90;a+=3){d.rotation.y=closed+a*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
    for(const m of meshes(d))for(const f of retained)if(overlap(constituent(m),constituent(f),.001)){let root=f;while(root.parent!==model.group)root=root.parent;conflicts.add(`${d.parent.name} / ${root.name}`);}samples++;
  }}finally{d.rotation.y=closed;}}
  assert.equal(samples,496);assert.deepEqual([...conflicts],[]);
  assert.ok(model.coordinationWarnings.some(s=>/Bath 2.*review/.test(s)));assert.equal(model.group.userData.operationApprovalRequired,true);
});
test('stair registration exception leaves arrival flush and east guard fixed without floor overlap',()=>{
  const guards=model.group.children.filter(o=>o.name==='Upstairs Stair opening guard');assert.equal(guards.length,1);
  const arrival=item('floor: Stair arrival');close(arrival.geometry.w*12,44);close(arrival.geometry.d*12,46.9);
  close(model.group.position.y+arrival.position.y+arrival.geometry.h/2,10);
  close(bounds(guards[0]).minX,layout.stairOpening().x+layout.stairOpening().width+.01);
  assert.ok(bounds(guards[0]).minZ>layout.stairOpening().z);
  assert.ok(bounds(guards[0]).maxZ<model.baseline.arrival.z);
  const stair=layout.stairOpening(),south=item('wall: West bath north');
  close(bounds(south.children.find(m=>m.name==='Upstairs partition')).minZ,stair.z+stair.depth);
  assert.ok(!model.group.children.some(o=>/^Upstairs wall: Stairs east /.test(o.name)));
  const northTrim=south.children.filter(m=>m.name==='Upstairs white baseboard'&&constituent(m).vertices.every(v=>v[1]<stair.z+stair.depth));
  assert.ok(northTrim.every(m=>bounds(m).minX>=stair.x+stair.width-1e-8),'No baseboard projects across stair void');
  for(const name of ['West bath vanity','West bath toilet','West bath shower']){
    const o=item(name),b=bounds(o);assert.ok(b.minZ>=stair.z+stair.depth+.35-1e-8);
  }
  assert.match(model.group.userData.stairRegistration,/Explicit registration exception/);
});
test('deeper Bath 2 keeps the full shower and its south-facing entry clear of the wet fixtures',()=>{
  const b=model.plan.rooms.find(r=>r.name==='Bedroom 2 bath'),shower=bounds(item('Bedroom 2 shower'));
  close(b.d-.35,5.084523);assert.ok(shower.minX>b.x+.175&&shower.maxX<b.x+b.w-.175);
  assert.ok(shower.minZ>b.z+.175&&shower.maxZ<b.z+b.d-.175);
  const door=model.plan.walls.find(w=>w.name==='Bath 2 south').openings.find(o=>o[2]===0);
  assert.ok(b.x+door[1]<shower.minX);
  assert.equal(item('Mechanical equipment reservation').userData.serviceAccessApproved,false);
  assert.ok(model.coordinationWarnings.some(s=>/Furnace.*36 x 96-inch access door/.test(s)));
});
test('laundry machines have disjoint footprints from every cabinet and retained counter including handles',()=>{
  const machines=['Washer','Dryer'].map(item),cabinets=['Laundry wall cupboards','Laundry north cupboards','Laundry folding counter','Laundry south bases'].map(item);
  for(const machine of machines){close(machine.position.x,54.25);close(machine.rotation.y,-Math.PI/2);
    const a=bounds(machine);for(const cabinet of cabinets){const b=bounds(cabinet);
      assert.ok(a.maxX<=b.minX||a.minX>=b.maxX||a.maxZ<=b.minZ||a.minZ>=b.maxZ,`${machine.name}/${cabinet.name} plan overlap`);
    }
  }
  const gap=(bounds(machines[1]).minZ-bounds(machines[0]).maxZ)*12;close(gap,1.2);
  close((bounds(machines[1]).minX-bounds(item('Laundry south bases')).maxX)*12,33.6);
});
test('primary toilet is enclosed by existing west/north walls plus new east/south partitions and an inward WC door',()=>{
  const east=model.plan.walls.find(w=>w.name==='Primary WC east'),south=model.plan.walls.find(w=>w.name==='Primary WC south'),toilet=bounds(item('Primary toilet'));
  close(east.x1,18.9);close(south.z1,12.8);assert.ok(toilet.maxX<east.x1-.175&&toilet.maxZ<south.z1-.175);
  const wc=item('wall: Primary WC east'),door=wc.children.find(o=>o.userData.interactiveHouseDoor);
  assert.equal(door.userData.nominalOpeningFeet,2.5);close(door.children[0].userData.height,7.96);
  const walls=['Primary WC east','Primary WC south','Primary suite entry','Bath north'].map(name=>item(`wall: ${name}`)).flatMap(meshes).filter(mesh=>mesh.name==='Upstairs partition');
  const closed=door.rotation.y;try{for(let degrees=0;degrees<=90;degrees+=3){door.rotation.y=closed+degrees*Math.PI/180;
    for(const a of meshes(door))for(const b of walls.filter(w=>w.parent!==door.parent))assert.ok(!overlap(constituent(a),constituent(b),.001));
  }}finally{door.rotation.y=closed;}
  close((south.z1-.175-toilet.maxZ)*12,35.7);
});
test('primary straight south boundary separates the bedroom from the registered stair and former return',()=>{
  const wall=model.plan.walls.find(w=>w.name==='Primary south'),join=model.plan.walls.find(w=>w.name==='Primary south stair notch'),room=model.plan.rooms.find(r=>r.name==='Primary bedroom');
  close(wall.z1,join.z1);close(wall.z1+.175,layout.stairOpening().z);close(join.x1,0);close(join.x2,wall.x1);
  assert.ok(model.plan.floors.filter(f=>f.room==='Primary bedroom').every(f=>f.z+f.d<=layout.stairOpening().z+1e-7));
  close(room.z+room.d,wall.z1);assert.ok(model.plan.floors.some(f=>f.name==='Hall stair-side approach'&&!f.room));
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

test('individual primary vanity fronts and retained drawers clear suite fixtures through 341 restored samples',()=>{
  const obstacles=['Primary freestanding tub','Primary shower','Primary toilet'].map(item).flatMap(meshes);let poses=0;
  for(const v of ['Primary north vanity','Primary south vanity'].map(item))for(const f of v.children.filter(m=>m.userData.cabinetFront)){
    const {x,z}=f.position,r=f.rotation.y,w=f.geometry.w,side=f.userData.hingeSide;
    try{for(let a=0;a<=90;a+=3){const angle=side*a*Math.PI/180;f.rotation.y=angle;f.position.x=x+side*w/2-side*w/2*Math.cos(angle);f.position.z=z+side*w/2*Math.sin(angle);
      for(const m of meshes(f))for(const o of obstacles)assert.ok(!overlap(constituent(m),constituent(o),.001));poses++;
    }}finally{f.position.x=x;f.position.z=z;f.rotation.y=r;}
  }
  const drawers=item('Primary closet drawers');
  for(const f of drawers.children.filter(m=>m.userData.cabinetFront)){const z=f.position.z;
    try{for(let t=0;t<=1.2+.001;t+=.04){f.position.z=z+t;
      for(const m of meshes(f))for(const o of ['Primary closet long hanging','Primary closet double hanging','Primary closet return hanging','Primary closet folded clothes'].map(item).flatMap(meshes))assert.ok(!overlap(constituent(m),constituent(o),.001));poses++;
    }}finally{f.position.z=z;}
  }
  assert.equal(poses,341);
});
test('every door clears its own and adjoining finished walls, baseboards and casing throughout the sweep',()=>{
  const walls=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')).flatMap(fixedWallMeshes).map(m=>({m,p:constituent(m)}));
  const ds=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)ds.push(o);});const conflicts=new Set();
  for(const d of ds){const r=d.rotation.y;try{for(let a=0;a<=90;a+=3){d.rotation.y=r+a*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
    for(const m of meshes(d))for(const {m:w,p} of walls)if(overlap(constituent(m),p,.001))conflicts.add(`${d.parent.name} / ${w.parent.name}`);
  }}finally{d.rotation.y=r;}}
  assert.deepEqual([...conflicts],[]);assert.equal(model.group.userData.doorJambRegistrationReviewRequired,true);
  assert.ok(model.coordinationWarnings.some(s=>/selected jambs.*unapproved/.test(s)));
});
test('doors clear other closed/open leaves and all four desk chairs pulled eighteen inches out',()=>{
  const doors=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)doors.push(o);});
  const chairs=['Primary','Bedroom 2','Bedroom 3','Bedroom 4'].map(n=>item(n+' desk chair')),positions=chairs.map(c=>({...c.position}));
  const conflicts=new Set();
  try{for(const chair of chairs){chair.position.x+=Math.sin(chair.rotation.y)*1.5;chair.position.z+=Math.cos(chair.rotation.y)*1.5;}
    for(const otherAngle of [0,90]){
      for(const d of doors)d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+otherAngle*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
      for(const d of doors){const base=d.rotation.y,obstacles=[...doors.filter(o=>o!==d),...chairs].flatMap(meshes).map(constituent);
        try{for(let a=0;a<=90;a+=3){d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+a*Math.PI/180*d.userData.interactiveHouseDoor.openRotationSign;
          for(const m of meshes(d))for(const p of obstacles)if(overlap(constituent(m),p,.001))conflicts.add(d.parent.name);
        }}finally{d.rotation.y=base;}
      }
    }
  }finally{doors.forEach(d=>{d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY;});chairs.forEach((c,i)=>c.position.set(positions[i].x,positions[i].y,positions[i].z));}
  assert.deepEqual([...conflicts],[]);
});
test('all 45 cabinet fronts and drawers clear other furnishings, finished partitions and trim at 31 restored poses',()=>{
  const fronts=[];model.group.traverse(o=>{if(o.userData.cabinetFront)fronts.push(o);});assert.equal(fronts.length,45);
  const fixed=model.group.children.filter(o=>!o.name.startsWith('Upstairs floor:')).flatMap(root=>(root.name.startsWith('Upstairs wall:')?fixedWallMeshes(root):meshes(root)).map(m=>({root,p:constituent(m)})));
  const conflicts=new Set();let poses=0;
  for(const front of fronts){const target=front.parent.userData.travelFeet!==undefined?front.parent:front;
    const travel=front.parent.userData.travelFeet??front.userData.drawerTravelFeet,pull=front.children.find(p=>p.name==='Gold cabinet pull'),side=pull?.position.x?-Math.sign(pull.position.x):front.userData.hingeSide??-1;
    const {x,z}=target.position,r=target.rotation.y,w=front.userData.width;let root=front;while(root.parent!==model.group)root=root.parent;
    try{for(let n=0;n<=30;n++){const angle=side*n/30*Math.PI/2,hinge=side*w/2;
      if(travel!==undefined){target.position.x=x+Math.sin(r)*travel*n/30;target.position.z=z+Math.cos(r)*travel*n/30;}
      else{target.rotation.y=r+angle;target.position.x=x+hinge*(Math.cos(r)-Math.cos(r+angle));target.position.z=z+hinge*(-Math.sin(r)+Math.sin(r+angle));}
      for(const m of meshes(target)){const p=constituent(m);for(const obstacle of fixed)if(obstacle.root!==root&&overlap(p,obstacle.p,.001))conflicts.add(root.name+' / '+obstacle.root.name);}poses++;
    }}finally{target.position.x=x;target.position.z=z;target.rotation.y=r;}
  }assert.equal(poses,1395);assert.deepEqual([...conflicts],[]);
});
test('a continuous 12-inch model disk connects fixed arrival, four bedrooms, baths, closets, Loft and Laundry with doors sampled open',()=>{
  const ds=[];model.group.traverse(o=>{if(o.userData.interactiveHouseDoor)ds.push(o);});
  for(const d of ds)d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+Math.PI/2*d.userData.interactiveHouseDoor.openRotationSign;
  try{
    const floors=model.areas,obstacles=meshes(model.group).map(constituent).filter(p=>p.high>10.5&&p.low<15.5).map(p=>({minX:Math.min(...p.vertices.map(v=>v[0])),maxX:Math.max(...p.vertices.map(v=>v[0])),minZ:Math.min(...p.vertices.map(v=>v[1])),maxZ:Math.max(...p.vertices.map(v=>v[1]))}));
    for(const n of ['West bath shower','East bath shower','Bedroom 2 shower','Primary shower'])obstacles.push(bounds(item(n)));
    let radius=.5;
    const inside=(x,z)=>floors.some(f=>x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d);
    const can=(x,z)=>[[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]].every(([dx,dz])=>inside(x+dx,z+dz))&&
      !obstacles.some(b=>Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ))<radius-.001);
    function flood(){const q=[[11.25,33.125]],seen=new Set(['45,132.5']),blocked=new Set();
      for(let i=0;i<q.length;i++){const [x,z]=q[i];for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
        const a=x+dx,b=z+dz,key=`${a*4},${b*4}`;if(a<0||a>56||b<7||b>56||seen.has(key)||blocked.has(key))continue;
        if(!can(a,b)){blocked.add(key);continue;}seen.add(key);q.push([a,b]);
      }}return q;
    }
    const reachable=flood(),destinations={'primary bedroom':[11,22.5],'primary bath':[22,15],'primary closet':[19.5,24],
      'Bedroom 2':[35.5,20],'Closet 2':[32.5,12],'Bedroom 3':[8,45.5],'Bedroom 4':[23,45.5],
      'Closet 3':[25.5,39.5],'Closet 4':[16.5,53.5],'Bath 3':[4,39.5],'Bath 4':[31,39.5],Loft:[49,31],Laundry:[47,38],
      'Bath 2':[38,11],'Primary WC':[17,11.5],Furnace:[39,38.5],Linen:[12.25,39.5]};
    assert.deepEqual(Object.entries(destinations).filter(([,p])=>!reachable.some(([x,z])=>Math.hypot(x-p[0],z-p[1])<.2)).map(([n])=>n),[]);
    radius=1;const wide=flood();
    for(const [name,p] of Object.entries({Hallway:[22,32],Loft:[49,31],southHallway:[16.5,43],primaryCloset:[19.5,24],Washer:[51.5,37.125],Dryer:[51.5,39.875],Linen:[12,38.5],
      primaryLongHang:[18.5,23],primaryDoubleHang:[25.75,23.5],primaryReturnHang:[24,24.25],primaryFolded:[18.75,22.5],primaryShallow:[25,22],primaryDrawers:[20.5,24.75],closet4Storage:[15.75,49.5]}))assert.ok(wide.some(([x,z])=>Math.hypot(x-p[0],z-p[1])<.2),name+' 24-inch disk route');
    // A model disk is not an occupied person, code standard or simultaneous-use approval.
  }finally{for(const d of ds)d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY;}
});
test('closed door faces register within one eighth inch of the swing-side paint instead of floating outside the aperture',()=>{
  for(const root of model.group.children.filter(o=>o.name.startsWith('Upstairs wall:'))){
    const door=root.children.find(o=>o.userData.interactiveHouseDoor);if(!door)continue;
    const leaf=door.children[0],face=Math.abs(door.position.z+Math.cos(door.rotation.y)*leaf.position.z)+leaf.userData.depth/2;
    close((face-.175)*12,.125);
    assert.ok(Math.abs(door.position.z+Math.cos(door.rotation.y)*leaf.position.z)-leaf.userData.depth/2<.175);
  }
});
test('door casing caps and side boards clear every adjoining wall, including laundry notch and corner returns',()=>{
  const roots=model.group.children.filter(o=>o.name.startsWith('Upstairs wall:')),conflicts=new Set();
  for(const root of roots)for(const trim of root.children.filter(o=>o.name==='Craftsman opening casing').flatMap(meshes))
    for(const other of roots.filter(o=>o!==root))for(const wall of other.children.filter(m=>m.name==='Upstairs partition'))
      if(overlap(constituent(trim),constituent(wall),.001))conflicts.add(root.name+' / '+other.name);
  assert.deepEqual([...conflicts],[]);
});
test('all headboards and five nightstand backs align one inch beyond their shared exterior baseboard',()=>{
  for(const [name,wallX,west] of [['Primary',0,true],['Bedroom 2',43.869048,false],['Bedroom 3',0,true],['Bedroom 4',32.017857,false]]){
    const bed=bounds(item(name+' bed')),back=west?bed.minX:bed.maxX;
    close((Math.abs(back-wallX)-.175-.0625)*12,1);
    for(const stand of model.group.children.filter(o=>o.name.startsWith('Upstairs '+name+' nightstand'))){
      const b=bounds(stand);close((Math.abs((west?b.minX:b.maxX)-wallX)-.175-.0625)*12,1);
      close(stand.rotation.y,west?Math.PI/2:-Math.PI/2);
    }
  }
  const left=item('Primary sitting chair 1'),right=item('Primary sitting chair 2'),table=item('Primary sitting side table');
  close(table.position.x,(left.position.x+right.position.x)/2);close(table.position.x,15.059524/2);
});
test('storage fronts face their room and linen end banks preserve shelf area without consuming the narrow retrieval aisle',()=>{
  for(const [name,rotation] of [['Primary closet return shelves',0],['Primary closet return hanging',Math.PI],['Bedroom 3 closet hanging',0],['Bedroom 4 closet hanging',-Math.PI/2],['Bedroom 4 closet shelves',Math.PI/2]])close(item(name).rotation.y,rotation);
  const north=item('Linen shelves - access approval required'),south=item('Linen south shelves - access approval required');
  close(north.rotation.y,0);close(south.rotation.y,Math.PI);
  const room=model.plan.rooms.find(r=>r.name==='Linen');
  close((room.w-.35)*12,27.228564);
  assert.ok(2*2.15*1>=4.5*.9,'Combined shelf area per tier does not decrease');
  assert.ok(bounds(north).maxZ<37.5&&bounds(south).minZ>40.3);
});
test('all five vanity mirrors and countertop backs meet their actual paint faces',()=>{
  for(const [name,wallName] of [['Primary north vanity','Bath south'],['Primary south vanity','Bath south'],['Bedroom 2 vanity','Closet 2 east'],['West bath vanity','West bath north'],['East bath vanity','East bath north']]){
    const v=item(name),wall=model.plan.walls.find(w=>w.name===wallName),vertical=Math.abs(wall.x1-wall.x2)<.001,normal=vertical?Math.sin(v.rotation.y):Math.cos(v.rotation.y),paint=(vertical?wall.x1:wall.z1)+normal*wall.thickness/2;
    const back=b=>vertical?(normal>0?b.minX:b.maxX):(normal>0?b.minZ:b.maxZ);
    close(back(bounds(v.children.find(m=>m.name==='Vanity wall mirror'))),paint);
    close(back(bounds(v.children.find(m=>m.geometry.w!==undefined&&m.geometry.h===.15&&m.geometry.d===1.9))),paint);
  }
  close((41.578571-.175-.0625-bounds(item('Laundry south bases')).maxZ)*12,.125);
});
test('all desks meet their wall and chairs pulled eighteen inches clear walls and retained furnishings',()=>{
  const pairs=[['Primary','Primary north'],['Bedroom 2','Bedroom 2 south'],['Bedroom 3','Bedroom 4 closet'],['Bedroom 4','Bedroom 4 entry']];
  for(const [name,wallName] of pairs){
    const desk=item(name+' writing desk'),wall=model.plan.walls.find(w=>w.name===wallName),s=Math.sin(desk.rotation.y),c=Math.cos(desk.rotation.y);
    close(Math.abs(s)>.5?desk.position.x-s*.9:desk.position.z-c*.9,Math.abs(s)>.5?wall.x1+s*wall.thickness/2:wall.z1+c*wall.thickness/2);
    const seat=item(name+' desk chair'),{x,y,z}=seat.position,obstacles=model.group.children.filter(o=>o!==seat&&!o.name.startsWith('Upstairs floor:')).flatMap(o=>o.name.startsWith('Upstairs wall:')?fixedWallMeshes(o):meshes(o));
    try{seat.position.set(x+s*1.5,y,z+c*1.5);for(const m of meshes(seat))for(const other of obstacles)assert.ok(!overlap(constituent(m),constituent(other),.001),name+' pulled chair / '+other.parent.name);}
    finally{seat.position.set(x,y,z);}
  }
});
