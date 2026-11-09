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
  assert.ok(!defs.some(d=>/Loft/.test(d.id)));
});

test('attic shed roof joins the upper wing and service return without hiding side windows',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  for(const id of ['Garage attic storage roof','Garage service return','Garage front gable']){
    assert.ok(plan.faces.some(f=>f.roof===id));
    if(id!=='Garage attic storage roof')assert.ok(plan.joins.some(j=>j.roofs.includes(id)));
  }
  const attic=defs.find(d=>d.id==='Garage attic storage roof');
  const service=defs.find(d=>d.id==='Garage service return');
  assert.ok(!defs.some(d=>d.id==='Garage north lean-to'));
  close(attic.bounds[0],g.east-.225);
  close(attic.bounds[1],g.atticEast+.7);
  close(roof.heightAt(attic.planes[0],[g.east+.75,g.atticSouth+.225]),22.6);
  close(roof.heightAt(attic.planes[0],[attic.bounds[1],g.atticSouth+.225]),10+10.66);
  for(const x of [45,49,55])close(roof.heightAt(attic.planes[0],[x,g.atticSouth+.225]),
    roof.heightAt(service.planes[1],[x,g.atticSouth+.225]));
  const atticEdges=plan.boundaries.filter(edge=>edge.roof===attic.id);
  assert.equal(atticEdges.length,3,'North/east eaves and the fitted raised west-wall abutment remain exposed');
  assert.ok(atticEdges.every(edge=>(Math.abs(edge.start[2]-attic.bounds[2])<1e-8&&Math.abs(edge.end[2]-attic.bounds[2])<1e-8)||
    (Math.abs(edge.start[0]-attic.bounds[1])<1e-8&&Math.abs(edge.end[0]-attic.bounds[1])<1e-8)||
    (Math.abs(edge.start[0]-attic.bounds[0])<1e-8&&Math.abs(edge.end[0]-attic.bounds[0])<1e-8)),
    'West edge has a fitted wall-head closure and south edge continues into the service return');
  close(g.east-attic.bounds[0],.225);
  assert.ok(roof.heightAt(attic.planes[0],[attic.bounds[0],30.7])-.16>=18,
    'The raised eave remains above the 8-ft head of the east-side windows');
  assert.ok(height(55.5,30)>18);
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

test('attic eave collector follows the raised roof and drops outside the garage perimeter',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf('  const atticRoof =');
  const end=source.indexOf("  drainageRoute(group, 'Garage east shoulder",start);
  assert.ok(start>0&&end>start,'Actual shared roof-derived collector extraction');
  let points;
  vm.runInNewContext(source.slice(start,end),{group:{},HomeRoof:roof,measuredUpper:upper.getUpstairsMeasuredGeometry(),
    floorToFloor:10,dark:{},drainageRoute:(parent,name,route)=>{points=route;}});
  assert.equal(points.length,7);
  assert.ok(points[0][1]>points[1][1],'The collector falls along the shed roof');
  assert.ok(points.slice(2).every(p=>p[0]>56.2),'The downpipe clears the lower roof edge');
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  for(const p of points.slice(0,2)){
    const faces=envelope.faces.filter(f=>roof.contains(f.polygon,[p[0],p[2]]));
    assert.ok(faces.length);
    const h=Math.max(...faces.map(face=>roof.heightAt(face.plane,[p[0],p[2]])));
    assert.ok(Math.abs(p[1]-h-.1)<1e-6,'Eave collector stays just above the actual roof surface');
  }
  assert.doesNotMatch(source,/const clippedEave|Clipped loft high-eave/);
});
