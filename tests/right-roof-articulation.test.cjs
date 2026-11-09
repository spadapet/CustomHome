'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const roof=require('../assets/js/floor-plan-roof.js');
const upper=require('../assets/js/floor-plan-upstairs.js');
const defs=roof.getConnectedRoofDefinitions();
const plan=roof.buildRoofEnvelope(defs);
const height=(x,z)=>Math.max(...defs.filter(d=>x>=d.bounds[0]&&x<=d.bounds[1]&&z>=d.bounds[2]&&z<=d.bounds[3])
  .map(d=>Math.min(...d.planes.map(p=>roof.heightAt(p,[x,z])))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('paired front gables retain their 25.4-ft crowns and follow the compact bedroom pairs',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  for(const [id,center] of [['West front gable',g.southClosetWest/2],['East front gable',(g.southClosetEast+g.southEast)/2]]){
    const d=defs.find(d=>d.id===id);
    close((d.bounds[0]+d.bounds[1])/2,center);
    close(Math.min(...d.planes.map(p=>roof.heightAt(p,[center,g.south+.75]))),25.4);
    assert.ok(plan.faces.some(f=>f.roof===id));
  }
  close(height(43.25,49.85),16.1);
  assert.ok(defs.some(d=>d.id==='East loft wing'));
});

test('full-height loft hip joins the upper wing and garage return without hiding side windows',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  for(const id of ['East loft wing','Garage service return','Garage front gable']){
    assert.ok(plan.faces.some(f=>f.roof===id));
    assert.ok(plan.joins.some(j=>j.roofs.includes(id)));
  }
  const loft=defs.find(d=>d.id==='East loft wing');
  assert.ok(!defs.some(d=>/attic|north lean-to/i.test(d.id)));
  close(loft.bounds[0],g.loftWest-.75);
  close(loft.bounds[1],g.east+.75);
  close(loft.bounds[2],g.loftNorth-.75);
  close(loft.bounds[3],g.bedNorth+.75);
  for(const plane of loft.planes)close(Math.hypot(plane[0],plane[1]),.25);
  for(const z of [25,30,37])assert.ok(height(g.east,z)-.16>19,'Loft/laundry roof covers nine-foot walls and eight-foot window heads');
  for(const j of plan.joins)for(const p of [j.start,j.end]){
    const touching=plan.faces.filter(f=>roof.contains(f.polygon,[p[0],p[2]])&&Math.abs(roof.heightAt(f.plane,[p[0],p[2]])-p[1])<1e-6);
    assert.ok(touching.length>=2,'No orphan joint or roof gap');
  }
});

test('garage front wall-head solids retain full wall depth and fit the actual lower roof at every vertex',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf('  for (const face of setbackPlan.faces) {');
  const end=source.indexOf('  for (const edge of setbackPlan.boundaries)',start);
  const meshes=[];
  vm.runInNewContext(source.slice(start,end),{
    HomeRoof:roof,setbackPlan:roof.buildRoofEnvelope(roof.getLowerRoofDefinitions()),wallThickness:.45,garageFacadeEaves:9,frontBrick:{},
    brickFaceUVs(){},setbackRoofs:{add:m=>meshes.push(m)},
    THREE:{BufferGeometry:class{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}},
      Float32BufferAttribute:class{constructor(array){this.array=array;}},Mesh:class{constructor(geometry){this.geometry=geometry;}}}
  });
  assert.ok(meshes.length);
  let minZ=Infinity,maxZ=-Infinity;
  for(const m of meshes)for(let i=0;i<m.geometry.position.array.length;i+=3){
    const [x,y,z]=m.geometry.position.array.slice(i,i+3);
    assert.ok(y>=9-1e-6&&y<=height(x,z)-.16+1e-6);
    minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  close(maxZ-minZ,.45);
});

test('loft eave collector falls toward the east outlet outside the upper and lower roof edges',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf('  const loftRoofEast =');
  const end=source.indexOf("  drainageRoute(group, 'Garage east shoulder",start);
  assert.ok(start>=0&&end>start);
  let points;
  const g=upper.getUpstairsMeasuredGeometry();
  vm.runInNewContext(source.slice(start,end),{group:{},measuredUpper:g,
    floorToFloor:10,dark:{},drainageRoute:(parent,name,route)=>{points=route;}});
  assert.equal(points.length,7);
  assert.ok(points[0][1]>points[1][1],'The collector has a positive modeled fall toward its outlet');
  assert.ok(points.slice(2).every(p=>p[0]>g.east+.75),'The downpipe clears both roof edges');
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  for(const p of points.slice(0,2)){
    const face=envelope.faces.find(f=>roof.contains(f.polygon,[p[0],p[2]]));
    assert.ok(face);
    const h=roof.heightAt(face.plane,[p[0],p[2]]);
    assert.ok(Math.abs(p[1]-h)<=.1+1e-6,'Collector lies at the eave, not suspended above a superseded shed roof');
  }
  assert.doesNotMatch(source,/const clippedEave|Clipped loft high-eave/);
});
