const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../upstairs-layout.js');

class Group {
  constructor() {
    this.children = [];
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.userData = {};
  }
  add(child) { this.children.push(child); child.parent = this; }
  updateMatrixWorld() {}
  getWorldPosition(vector) {
    vector.y=0;
    for(let node=this;node;node=node.parent) vector.y+=node.position.y;
    return vector;
  }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
}
class CylinderGeometry {
  constructor(top, bottom, length) { this.length = length; }
}
function build() {
  const context = { UpstairsLayout: layout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'floor-plan-upstairs.js'), 'utf8'), context);
  const material = {};
  const helpers = {
    box(parent, x, y, z, w, h, d) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    mat: () => material, wood: material, wallMaterial: material, windowTrim: material,
    oak: material, cream: material, black: material, steel: material, linen: material,
    windowFrame() {}, openingCasing() {}
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const doorContext = { THREE: { Group }, box: helpers.box, windowTrim: material };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function shakerFront(')), doorContext);
  helpers.singlePanelDoor = doorContext.singlePanelDoor;
  const casingContext={THREE:{Group,Vector3:class{}},box:helpers.box,windowTrim:material,walls:[],casingSideWidth:3.5/12,casingReveal:.125/12};
  vm.runInNewContext(source.slice(source.indexOf('  function openingCasing('),source.indexOf('  const baseTrimSections')),casingContext);
  helpers.openingCasing=casingContext.openingCasing;
  return context.buildUpstairsModel({ Group, Mesh, CylinderGeometry }, helpers, layout.stairOpening(), 10);
}
const model = build();
test('upstairs room-width openings receive trim-matched single-panel operable doors', () => {
  const leaves = [];
  model.group.traverse((part) => { if (part.userData.doorStyle === 'Single recessed panel') leaves.push(part); });
  assert.equal(leaves.length, 16);
  for (const leaf of leaves) {
    assert.equal(leaf.children.filter((part) => part.name === 'Interior door single recessed field').length, 1);
    assert.equal(leaf.userData.height, 7.96);
    assert.equal(leaf.parent.userData.interactiveHouseDoor.openAngleDegrees, 0);
    assert.equal(leaf.parent.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  }
});
const item = (name) => {
  const result = model.group.children.find((child) => child.name === `Upstairs ${name}`);
  assert.ok(result, `${name} exists`);
  return result;
};
function bounds(group) {
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  group.traverse((mesh) => {
    const { w, d } = mesh.geometry ?? {};
    if (w === undefined) return;
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
      let worldX = dx;
      let worldZ = dz;
      for (let node = mesh; node; node = node.parent) {
        const cosine = Math.cos(node.rotation.y);
        const sine = Math.sin(node.rotation.y);
        [worldX, worldZ] = [node.position.x + cosine * worldX + sine * worldZ, node.position.z - sine * worldX + cosine * worldZ];
      }
      result.minX = Math.min(result.minX, worldX);
      result.maxX = Math.max(result.maxX, worldX);
      result.minZ = Math.min(result.minZ, worldZ);
      result.maxZ = Math.max(result.maxZ, worldZ);
    }
  });
  return result;
}

test('upstairs builds without canvas labels and retains navigation destinations', () => {
  assert.equal(model.labels, undefined);
  assert.equal(model.group.children.some((child) => /label/i.test(child.name)), false);
  assert.equal(model.mapLabels.length, model.rooms.length);
});

test('all bedrooms have bedside furniture, lighting and separate dressers', () => {
  for (const name of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4']) {
    const bed = item(`${name} bed`);
    assert.equal(bed.children.filter((mesh) => mesh.geometry.w === 1.55 && mesh.geometry.h === 1.9).length, name === 'Primary' ? 2 : 1);
    const mattress = bed.children.find((mesh) => mesh.name === 'Bed mattress');
    assert.equal(mattress.geometry.w * 12, name === 'Primary' ? 60 : 54);
    assert.equal(mattress.geometry.d * 12, name === 'Primary' ? 80 : 75);
    item(`${name} desk chair`);
    item(`${name} writing desk`);
    assert.equal(item(`${name} desk wall lamp`).userData.wallMounted, true);
    assert.equal(item(`${name} bed bedside wall lamp left`).userData.wallMounted, true);
    item(`${name} dresser`);
  }
  for (const name of ['Loft reading chair', 'Loft media console', 'Loft coffee table and rug', 'Loft desk chair', 'Laundry wall cupboards']) item(name);
});

test('bedroom furnishings clear finished room edges and each other above rugs', () => {
  for (const name of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4']) {
    const room = model.rooms.find((room) => room.name === (name === 'Primary' ? 'Primary bedroom' : name));
    const furnishings = ['bed', 'dresser', 'writing desk', 'desk chair'].map((suffix) => item(`${name} ${suffix}`));
    if (name === 'Primary') furnishings.push(item('Primary sitting chair 1'), item('Primary sitting chair 2'), item('Primary sitting side table'));
    const solids = furnishings.map((furnishing) => {
      const proxy = new Group();
      proxy.position = furnishing.position;
      proxy.rotation = furnishing.rotation;
      proxy.children = furnishing.children.filter((mesh) => mesh.position.y > 0.1);
      return bounds(proxy);
    });
    for (let i = 0; i < solids.length; i++) {
      const a = solids[i];
      assert.ok(a.minX >= room.x + 0.2 && a.maxX <= room.x + room.w - 0.2 && a.minZ >= room.z + 0.2 && a.maxZ <= room.z + room.d - 0.2, furnishings[i].name);
      for (let j = 0; j < i; j++) {
        const meshes = (furnishing) => furnishing.children.filter((mesh) => mesh.position.y > 0.1).map(bounds);
        for (const first of meshes(furnishings[i])) for (const second of meshes(furnishings[j])) {
          assert.ok(Math.min(first.maxX, second.maxX) <= Math.max(first.minX, second.minX) + 0.001 || Math.min(first.maxZ, second.maxZ) <= Math.max(first.minZ, second.minZ) + 0.001, `${furnishings[i].name} overlaps ${furnishings[j].name}`);
        }
      }
    }
  }
  item('Primary wall TV');
});

test('closets have continuous rods and clothing rather than shelves called rails', () => {
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet return hanging', 'Bedroom 2 closet hanging', 'Bedroom 3 closet hanging', 'Bedroom 4 closet hanging']) {
    const bay = item(name);
    const rods = bay.children.filter((mesh) => mesh.name === 'Continuous hanging rod');
    assert.equal(rods.length, bay.userData.doubleHang ? 2 : 1);
    assert.ok(rods.every((rod) => rod.geometry.length > 3.5));
    assert.ok(bay.children.some((mesh) => mesh.geometry.h === (bay.userData.doubleHang ? 2.6 : 4.8)));
    assert.equal(bay.userData.storageDepthFeet, 2);
  }
});

test('front redesign leaves window approaches and occupied desk-to-bed route clear', () => {
  const dresser = bounds(item('Bedroom 3 dresser'));
  assert.ok(dresser.minX >= 10.84 && dresser.maxZ < 49.3, 'East-wall dresser including handles clears both front windows and entry');
  const desk = bounds(item('Bedroom 4 writing desk'));
  const chair = bounds(item('Bedroom 4 desk chair'));
  const bed = item('Bedroom 4 bed').children.find(m => m.name === 'Bed mattress');
  const mattress = bounds(bed);
  assert.ok(desk.maxZ <= 48.35 + 1e-8, 'Desk clears the closet door operating through its complete 90-degree sweep');
  assert.ok(chair.maxZ < 49.2, 'Occupied chair stays north of closet approach');
  assert.ok((mattress.minX - chair.maxX) * 12 >= 24, 'At least 24 inches remain between chair and mattress, not a certified passage');
  for (const name of ['Bedroom 3', 'Bedroom 4']) {
    for (const suffix of ['bed', 'dresser', 'writing desk', 'desk chair']) {
      const object = item(`${name} ${suffix}`);
      for (const mesh of object.children.filter(m => m.position.y > 0.1)) {
        assert.ok(bounds(mesh).maxZ < 52.9, `${name} front wall has no furnishings against window cranks`);
      }
    }
  }
});

test('wall lamps mount on solid wall rather than across windows or door openings', () => {
  for (const lamp of model.group.children.filter((object) => object.userData.wallMounted)) {
    const { x, z } = lamp.position;
    const host = model.plan.walls.find((wall) => {
      const vertical = Math.abs(wall.x1 - wall.x2) < 0.001;
      const along = vertical ? z - wall.z1 : x - wall.x1;
      return Math.abs((vertical ? x : z) - (vertical ? wall.x1 : wall.z1)) < 0.3 && along > 0 && along < Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
    });
    assert.ok(host, `${lamp.name} has a supporting wall`);
    const along = Math.abs(host.x1 - host.x2) < 0.001 ? z - host.z1 : x - host.x1;
    assert.ok(host.openings.every(([start, end, bottom, top]) => top < 4.9 || bottom > 5.6 || along + 0.28 <= start || along - 0.28 >= end), `${lamp.name} clears openings`);
  }
});

test('primary closet includes hardware in its 38.4-inch aisle and clears both entries', () => {
  const dresser = bounds(item('Primary closet drawers'));
  const hanging = bounds(item('Primary closet long hanging'));
  assert.ok(Math.abs((hanging.minZ - dresser.maxZ) * 12 - 38.4) < 0.001);
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet folded clothes']) {
    const b = bounds(item(name));
    assert.ok(b.minZ >= 19.6, `${name} clears west entry ending at z=19.2`);
    assert.ok(b.maxZ <= 21.75, `${name} clears south wall trim`);
    assert.ok(b.maxX <= 28.5, `${name} leaves east connecting approach open`);
  }
  assert.ok(bounds(item('Primary closet return hanging')).maxZ < 17.8);
});

test('bedroom 2 toilet no longer overlaps the vanity', () => {
  const toilet = bounds(item('Bedroom 2 toilet'));
  const vanity = bounds(item('Bedroom 2 vanity'));
  assert.ok(toilet.maxZ < vanity.minZ);
});

test('closet inspection reveals hanging contents and other views restore canopy shelves', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('    upstairs.group.traverse((object) => {', source.indexOf('  function setView(name)'));
  assert.ok(start > 0);
  const end = source.indexOf('    const planView', start);
  const canopies = [];
  model.group.traverse((object) => { if (object.userData.closetCanopy) canopies.push(object); });
  assert.equal(canopies.length, 6);
  for (const name of ['upstairs-primary-closet', 'upstairs', 'whole', 'upstairs-bedroom-2-closet', 'upstairs-top']) {
    vm.runInNewContext(source.slice(start, end), { upstairs: model, name });
    assert.ok(canopies.every((object) => object.visible === !name.includes('closet')), name);
  }
});

// Constituent oriented rectangles: do not mistake the empty interior of an
// assembled cabinet, chair or shower for solid material.
function constituent(mesh) {
  const { w, h, d } = mesh.geometry;
  let y = 0;
  for (let node = mesh; node; node = node.parent) y += node.position.y;
  const vertices = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z]) => {
    for (let node = mesh; node; node = node.parent) {
      const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y);
      [x,z] = [node.position.x+c*x+s*z,node.position.z-s*x+c*z];
    }
    return [x,z];
  });
  return { vertices, low: y-h/2, high: y+h/2 };
}
function positiveOverlap(a, b, tolerance = 0.015) {
  if (Math.min(a.high,b.high)-Math.max(a.low,b.low) <= tolerance) return false;
  for (const vertices of [a.vertices,b.vertices]) for (let i=0;i<4;i++) {
    const p=vertices[i], q=vertices[(i+1)%4], ax=-(q[1]-p[1]), az=q[0]-p[0];
    const first=a.vertices.map(([x,z])=>x*ax+z*az), second=b.vertices.map(([x,z])=>x*ax+z*az);
    if (Math.min(Math.max(...first),Math.max(...second))-Math.max(Math.min(...first),Math.min(...second)) <= tolerance*Math.hypot(ax,az)) return false;
  }
  return true;
}
function meshes(root) {
  const result=[];
  root.traverse(o=>{if(o.geometry?.w !== undefined) result.push(o);});
  return result;
}
test('closed leaves and full 90-degree sweeps clear fixtures/walls with tucked and pulled-out desk chairs', () => {
  const doors=[];
  model.group.traverse(o=>{if(o.userData.interactiveHouseDoor) doors.push(o);});
  const chairs=['Primary','Bedroom 2','Bedroom 3','Bedroom 4'].map(n=>item(`${n} desk chair`));
  const poses=chairs.map(c=>({...c.position}));
  for(const pullback of [0,.75]) {
  chairs.forEach((c,i)=>{
    c.position.x=poses[i].x+Math.sin(c.rotation.y)*pullback;
    c.position.z=poses[i].z+Math.cos(c.rotation.y)*pullback;
  });
  for (const door of doors) {
    const obstacles=meshes(model.group).filter(m=>{
      let n=m;
      while(n && n!==model.group) {
        if(n===door.parent) return false; // Own jamb contact is intentional.
        n=n.parent;
      }
      const b=constituent(m);
      return b.high>10.1 && b.low<18 && !m.name?.includes('floor:');
    }).map(m=>({m,b:constituent(m)}));
    for(let degrees=0;degrees<=90;degrees+=3) {
      door.rotation.y=door.userData.interactiveHouseDoor.closedRotationY+degrees*Math.PI/180*door.userData.interactiveHouseDoor.openRotationSign;
      for(const leaf of meshes(door)) for(const {m,b} of obstacles) {
        assert.ok(!positiveOverlap(constituent(leaf),b),`${door.name} at ${degrees} overlaps ${m.parent.name}/${m.name}`);
      }
    }
    door.rotation.y=door.userData.interactiveHouseDoor.closedRotationY;
    assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees,0);
  }
  }
  chairs.forEach((c,i)=>Object.assign(c.position,poses[i]));
});

test('service core recovers a broad finished gallery and a usable laundry aisle', () => {
  const wall=(name)=>model.plan.walls.find(w=>w.name===name);
  assert.equal(wall('Laundry entry').x1,24);
  const trimProjection=.175+.0625;
  assert.ok((24-trimProjection-(layout.stairOpening().x+layout.stairOpening().width+.04))*12>164);
  assert.ok((27.6-22-2*trimProjection)*12>61);
  const washer=bounds(item('Washer')), counter=bounds(item('Laundry folding counter'));
  assert.ok((counter.minZ-washer.maxZ)*12>=36-1e-8,'Hardware included in folding aisle');
  assert.ok((washer.minZ-27.8375)*12>=4.3,'Reserve rear hookup depth beyond finished baseboard');
  assert.equal(wall('Primary closet east').openings.length,0,'No access through another child bedroom');
  assert.deepEqual(Array.from(model.start),[16.5,33]);
});

test('changed fixtures clear finished walls and gallery floor pieces do not overlap', () => {
  const walls=model.group.children.filter(o=>o.name?.startsWith('Upstairs wall:')).flatMap(o=>o.children.filter(m=>m.geometry?.w!==undefined));
  for(const name of ['Washer','Dryer','Laundry folding counter','Laundry wall cupboards','Linen shelves','Mechanical equipment reservation','West bath vanity','East bath vanity','West bath toilet','East bath toilet','West bath shower','East bath shower']) {
    for(const m of meshes(item(name))) for(const w of walls) assert.ok(!positiveOverlap(constituent(m),constituent(w)),`${name} penetrates ${w.parent.name}/${w.name}`);
  }
  const floors=model.plan.floors;
  for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++){
    const a=floors[i],b=floors[j];
    assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.001 || Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)<.001,`${a.name}/${b.name} have duplicate floor coverage`);
  }
});

test('front-entry projecting casing caps clear perpendicular bathroom and closet returns', () => {
  for(const name of ['Bedroom 3 north','Bedroom 4 north']) {
    const host=item(`wall: ${name}`);
    const casings=host.children.filter(o=>o.name==='Craftsman opening casing');
    assert.equal(casings.length,2);
    for(const casing of casings) {
      assert.equal(casing.userData.sideWidthInches,2.5);
      for(const m of meshes(casing)) for(const wall of model.group.children.filter(o=>o.name?.startsWith('Upstairs wall:')&&o!==host)) {
        for(const n of wall.children.filter(o=>o.geometry?.w!==undefined)) assert.ok(!positiveOverlap(constituent(m),constituent(n)),`${name}: ${m.name} penetrates ${wall.name}`);
      }
    }
  }
});

test('open-door tour routes reach every private room and service without crossing shower pans', () => {
  const doors=[];
  model.group.traverse(o=>{if(o.userData.interactiveHouseDoor) doors.push(o);});
  for(const d of doors) d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+Math.PI/2*d.userData.interactiveHouseDoor.openRotationSign;
  for(let i=0;i<doors.length;i++)for(let j=0;j<i;j++)for(const a of meshes(doors[i]))for(const b of meshes(doors[j]))assert.ok(!positiveOverlap(constituent(a),constituent(b)),`${doors[i].name} clashes with ${doors[j].name} when all leaves are open`);
  const floors=[...model.areas];
  const obstacles=meshes(model.group).filter(m=>{
    const b=constituent(m);
    return b.high>10.5 && b.low<15.5;
  }).map(bounds);
  // A pan is a destination, not a through-route to a toilet or another room.
  for(const name of ['West bath shower','East bath shower','Bedroom 2 shower','Primary shower']) obstacles.push(bounds(item(name)));
  const inside=(x,z)=>floors.some(f=>x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d);
  const can=(x,z)=>[[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]].every(([dx,dz])=>inside(x+dx,z+dz)) &&
    !obstacles.some(b=>Math.hypot(x-Math.max(b.minX,Math.min(x,b.maxX)),z-Math.max(b.minZ,Math.min(z,b.maxZ)))<.5-.001);
  const queue=[[16.5,33]], visited=new Set(['66,132']);
  for(let n=0;n<queue.length;n++){
    const [x,z]=queue[n];
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const a=x+dx,b=z+dz,key=`${a*4},${b*4}`;
      if(a<0||a>54||b<2||b>54||visited.has(key)||!can(a,b)) continue;
      visited.add(key);queue.push([a,b]);
    }
  }
  const destinations={
    'primary bedroom':[11,24], 'primary bath':[18,10], 'primary toilet':[11.5,6],
    'primary closet':[20,18], 'bedroom 2':[33,18], 'bedroom 2 bath':[45.5,12.5],
    'bedroom 2 closet':[47,18.5], 'bedroom 3':[10.75,44.5], 'bedroom 3 closet':[14.5,43],
    'bedroom 4':[22.75,46.5], 'bedroom 4 closet':[16,49], 'west toilet approach':[5,40],
    'east toilet approach':[26.5,40], laundry:[27.5,32.5], linen:[34,28.5],
    mechanical:[35,32], loft:[39,25], 'loft seating':[43,29]
  };
  const missing=Object.entries(destinations).filter(([, [x,z]])=>!visited.has(`${x*4},${z*4}`)).map(([name,[x,z]])=>`${name} (${can(x,z)?'disconnected':'destination blocked'})`);
  assert.deepEqual(missing,[],'Every destination has a continuous route for the 12-inch-diameter model tour avatar');
  for(const d of doors) d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY;
  assert.ok(queue.length>1000);
});

test('real upstairs door/cabinet click handler invalidates tour collisions after each operation', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','floor-plan-3d.js'),'utf8');
  const wall=item('wall: Bedroom 3 north');
  const hinge=wall.children.find(o=>o.userData.interactiveHouseDoor);
  let selected=hinge.children[0], rebuilds=0, cabinetToggles=0;
  for(let n=selected;n;n=n.parent)n.visible=true;
  const context={
    activeFloor:'upstairs',groundLayoutPreview:null,
    renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})}},
    scene:{children:[],updateMatrixWorld(){}},camera:{updateMatrixWorld(){}},
    THREE:{Vector2:class{},Raycaster:class{setFromCamera(){}intersectObjects(){return[{object:selected}]}},MathUtils:{degToRad:d=>d*Math.PI/180}},
    buildWalkObstacles(){rebuilds++;},render(){},toggleCabinet(){cabinetToggles++;}
  };
  vm.runInNewContext(source.slice(source.indexOf('  function pickHouseDoor('),source.indexOf('  const charger = furnishing(')),context);
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);
  assert.equal(hinge.userData.interactiveHouseDoor.openAngleDegrees,90);
  assert.equal(hinge.rotation.y,-Math.PI/2);
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);
  assert.equal(hinge.rotation.y,0);
  selected={visible:true,userData:{interactiveCabinet:{}}};
  context.pickHouseDoor({clientX:400,clientY:300});
  assert.equal(cabinetToggles,1);
  assert.equal(rebuilds,3);
});
