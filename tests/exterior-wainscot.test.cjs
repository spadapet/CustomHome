'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../floor-plan-ground.js');
const upper = require('../floor-plan-upstairs.js');
const HomeRoof = require('../floor-plan-roof.js');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
const groundSource = fs.readFileSync(require.resolve('../floor-plan-ground.js'), 'utf8');
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b} ft`);

function fixture() {
  class Group {
    constructor() {
      this.name=''; this.children=[]; this.userData={}; this.rotation={y:0};
      this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}};
    }
    add(o){o.parent=this;this.children.push(o);}
    updateWorldMatrix(){}
    localToWorld(v){return v;} // No installation overrides in this bounded fixture.
  }
  const meshes=[], openings=[];
  const box=(parent,x,y,z,w,h,d,material)=>{
    const o=new Group();Object.assign(o,{x,y,z,w,h,d,material});
    o.position.set(x,y,z);parent.add(o);meshes.push(o);return o;
  };
  const group=new Group(), brick={}, stone={}, trim={}, glass={};
  const c={...ground,...upper,HomeRoof,group,box,trim,glass,white:{},dark:{},windowBlack:{},privacyGlass:{},
    masonryMaps:null,mat:()=>({}),wallThickness:.45,windowInstallations:[],
    floorToFloor:10,eaves:19,garageFloorY:-1.25,frontWallZ:ground.getGroundFrontLayout().wallZ,
    entryWood:{},THREE:{Group,Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}},
    brickBox(parent,x,y,z,w,h,d,base=false){
      const m=box(parent,x,y,z,w,h,d,base?stone:brick);
      m.userData.cladding=base?'stone':'brick';return m;
    }};
  vm.createContext(c);
  const run=(text,start,end)=>{
    const a=text.indexOf(start),b=text.indexOf(end,a);
    assert.ok(a>=0&&b>a, `Missing production extraction: ${start}`);
    vm.runInContext(text.slice(a,b),c);
  };
  vm.runInContext(source.slice(0,source.indexOf('function buildExteriorModel'))+
    '\nconst cladding = getExteriorCladdingStudy();',c);
  run(groundSource,'function addFrontWindowGrilles(','function addSingleHungSashes(');
  run(source,'  function windowUnit(','  const win =');
  const actualWall=c.wall;
  c.wall=(...args)=>{openings.push(args);return actualWall(...args);};
  c.buildArchedFrontEntry=()=>{}; // Door assembly is unchanged; retain its opening cut.
  run(source,'  const win =','  // The resolved upstairs stops');
  for(const name of ['patioBounds','livingPatioBounds']){
    const line=source.split('\n').find(line=>line.startsWith(`  const ${name} =`));
    assert.ok(line);vm.runInContext(line,c);
  }
  run(source,'  const patioRoofPitch =','  const patioRoof =');
  run(source,'  function patioRoofUndersideAt(','  const patioSideClosureStart =');
  return {c,group,meshes,openings,brick,stone,trim,glass,run,Group};
}

test('all actual perimeter walls and returns have continuous low stone/coping and brick above, excluding fixed openings',()=>{
  const {group,openings,brick,stone}=fixture();
  const upperSegments = upper.getUpstairsExteriorSegments();
  assert.equal(openings.length, 11 + upperSegments.length, 'Ten ground perimeter walls, shared upper perimeter and patio headwall');
  assert.deepEqual(openings.filter(([name]) => name.startsWith('upper ')).map(([name]) => name),
    upperSegments.map(([name]) => `upper ${name}`), 'Include every measured upstairs return');
  for(const [name,x1,z1,x2,z2,bottom,top,holes=[]] of openings){
    const wall=group.children.find(o=>o.name===`Exterior brick wall: ${name}`);
    assert.ok(wall,name);
    const panels=wall.children.filter(o=>o.material===brick||o.material===stone||o.userData.cladding==='coping');
    const length=Math.hypot(x2-x1,z2-z1);
    // Sample the wall field, not trim or upper applied piers. Every solid point
    // must have exactly one field material; every opening point must have none.
    const fields=panels.filter(o=>Math.abs(o.z)<1e-8);
    let solid=0;
    for(let x=.137;x<length;x+=.31) for(let y=Math.max(bottom,-.2)+.113;y<top;y+=.23){
      const hole=holes.some(o=>x>o.center-o.width/2&&x<o.center+o.width/2&&y>o.sill&&y<o.sill+o.height);
      const hits=fields.filter(o=>x>o.x-o.w/2&&x<o.x+o.w/2&&y>o.y-o.h/2&&y<o.y+o.h/2);
      assert.equal(hits.length,hole?0:1,`${name} field at ${x},${y}`);
      if(!hole){
        solid++;
        if(y<2)assert.equal(hits[0].material,stone);
        else if(y>2.125)assert.equal(hits[0].material,brick);
        else assert.equal(hits[0].userData.cladding,'coping');
      }
    }
    assert.ok(solid>0, `${name}: sample solid cladding even on short measured returns`);
    const bases=panels.filter(o=>o.material===stone);
    if(bottom<2) assert.ok(bases.some(o=>Math.abs(o.y+o.h/2-2)<1e-8),name);
    else assert.equal(bases.length,0,name);
    assert.ok(bases.every(o=>o.y+o.h/2<=2+1e-8),name);
    assert.ok(panels.some(o=>o.material===brick),name);
  }
});

test('actual sill/trim constituent bounds control coping, without moving any window opening',()=>{
  const {c,group,meshes,openings,trim,glass}=fixture();
  const groundWalls=group.children.filter(o=>o.name.startsWith('Exterior brick wall:')&&!o.name.includes('upper'));
  const sillMeshes=meshes.filter(o=>groundWalls.includes(o.parent)&&o.material===trim&&
    o.h<=.221&&o.y>1&&o.y<4&&!o.name.includes('coping'));
  const underside=Math.min(...sillMeshes.map(o=>o.y-o.h/2));
  close(underside,2.1975);
  close((underside-c.getExteriorCladdingStudy().copingTop)*12,.87);
  const front=openings.find(o=>o[0]==='front ground floor')[7];
  assert.deepEqual(JSON.parse(JSON.stringify(front.filter(o=>!o.door))),ground.getGroundFrontWindows());
  const east=openings.find(o=>o[0]==='east ground floor')[7];
  const prep=ground.getPrepWindowLayout().find(o=>o.x===55.5);
  const cut=east.find(o=>o.frameSill===prep.sill);
  close(cut.sill,prep.openingSill);close(cut.width,prep.openingWidth);
  const panes=meshes.filter(o=>o.material===glass);
  assert.ok(panes.length>=30);
  assert.ok(panes.every(o=>o.parent.position.y+o.y-o.h/2>2.125),'Coping never reaches glazing');
});

test('actual fitted gable/attic wall closures use the same brick material as the remaining wall height',()=>{
  const {c,run,Group}=fixture();
  c.eaves=19; c.frontBrick={clone(){return {brick:true};}};
  c.houseRoof=new Group();c.brickFaceUVs=()=>{};
  c.THREE.BufferGeometry=class {
    constructor(){this.attributes={};}
    setAttribute(name,a){this.attributes[name]=a;}
    computeVertexNormals(){}
  };
  c.THREE.Float32BufferAttribute=class {constructor(array){this.array=array;}};
  c.THREE.Mesh=class extends Group {constructor(geometry,material){super();Object.assign(this,{geometry,material});}};
  run(source,'  const houseRoofPlan =','  houseRoof.userData.drainageIntent =');
  const closures=c.houseRoof.children;
  assert.ok(closures.length>=10);
  assert.ok(closures.every(o=>o.material.brick&&o.userData.cladding==='brick'));
  const ys=closures.flatMap(o=>o.geometry.attributes.position.array.filter((_,i)=>i%3===1));
  assert.ok(Math.min(...ys)>=19);
  assert.ok(Math.max(...ys)>24,'Both tall front gable wall closures remain brick');
});
