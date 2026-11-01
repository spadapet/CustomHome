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

test('raised garage returns cover only remaining garage roof with real clipped joints',()=>{
  for(const id of ['Garage north lean-to','Garage service return','Garage front gable']){
    assert.ok(plan.faces.some(f=>f.roof===id));
    if(id!=='Garage north lean-to')assert.ok(plan.joins.some(j=>j.roofs.includes(id)));
  }
  const north=defs.find(d=>d.id==='Garage north lean-to'),service=defs.find(d=>d.id==='Garage service return');
  for(const x of [45,49,55])close(roof.heightAt(north.planes[0],[x,41]),roof.heightAt(service.planes[1],[x,41]));
  close(height(45,30),roof.heightAt(north.planes[0],[45,30]));
  assert.ok(height(55.5,30)>9);
  assert.ok(height(45,16.5)<13&&height(45,23)<13&&height(45,30.7)<13,'Garage roof does not bury upper east glazing');
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

test('compact service leader bypasses the garage perimeter and no clipped loft conductor remains',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf("  drainageRoute(group, 'Compact service eave");
  const end=source.indexOf("  drainageRoute(group, 'Garage east shoulder",start);
  let points;
  vm.runInNewContext(source.slice(start,end),{group:{},measuredUpper:upper.getUpstairsMeasuredGeometry(),
    dark:{},drainageRoute:(parent,name,route)=>{points=route;}});
  assert.equal(points.length,7);
  for(let i=1;i<points.length;i++)assert.ok(points[i][1]<points[i-1][1]);
  assert.ok(points.slice(4).every(p=>p[0]>56.2),'Vertical leader clears lower roof edge');
  const defs=roof.getConnectedRoofDefinitions(),envelope=roof.buildRoofEnvelope(defs);
  for(const p of points.slice(2,4)){
    const face=envelope.faces.find(f=>roof.contains(f.polygon,[p[0],p[2]]));
    assert.ok(face);
    const h=roof.heightAt(face.plane,[p[0],p[2]]);
    assert.ok(p[1]-h>=.07&&p[1]-h<.15,'Enclosed collector sits above the actual east-falling roof, not across a high void');
  }
  assert.doesNotMatch(source,/const clippedEave|Clipped loft high-eave/);
});
