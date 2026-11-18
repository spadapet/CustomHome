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

test('adopted gables retain measured bedroom centers and the garage crown matches them',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  for(const[id,center]of[['West front gable',g.southClosetWest/2],['East front gable',(g.southClosetEast+g.southEast)/2]]){
    const definition=defs.find(d=>d.id===id);
    close((definition.bounds[0]+definition.bounds[1])/2,center);
    close(Math.min(...definition.planes.map(p=>roof.heightAt(p,[center,g.south+.75]))),27.775);
    assert.ok(plan.faces.some(f=>f.roof===id));
  }
  close(height(43.25,49.85),27.775);
  assert.ok(!defs.some(d=>['Garage service return','Garage attic storage roof','Garage hip'].includes(d.id)));
});

test('rear metal roof clears the unchanged east bedroom windows and the loft roof begins behind them',()=>{
  const g=upper.getUpstairsMeasuredGeometry();
  const low=defs.find(d=>d.id==='Garage rear metal lean-to');
  const garage=defs.find(d=>d.id==='Garage room-in-roof');
  close(low.bounds[0],g.east+.225);
  for(const[,x,z,width]of upper.getUpstairsSideWindows().filter(w=>/^Bedroom 2 east/.test(w[0]))){
    assert.ok(z+width/2<garage.bounds[2]);
    assert.ok(roof.heightAt(low.planes[0],[low.bounds[0],z])<13);
  }
  for(const join of plan.joins)for(const p of[join.start,join.end]){
    const touching=plan.faces.filter(f=>roof.contains(f.polygon,[p[0],p[2]])&&Math.abs(roof.heightAt(f.plane,[p[0],p[2]])-p[1])<1e-6);
    assert.ok(touching.length>=2,'No orphan roof crease');
  }
});

test('garage wall-head solids retain wall depth and fit the new room-in-roof front at every vertex',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf('  for (const face of setbackPlan.faces) {');
  const end=source.indexOf('  if(!HomeRoof.studyAlternative)',start);
  assert.ok(start>0&&end>start);
  const meshes=[];
  vm.runInNewContext(source.slice(start,end),{
    HomeRoof:roof,setbackPlan:roof.buildRoofEnvelope(defs),wallThickness:.45,garageFacadeEaves:19,frontBrick:{},
    brickFaceUVs(){},setbackRoofs:{add:m=>meshes.push(m)},
    THREE:{BufferGeometry:class{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}},
      Float32BufferAttribute:class{constructor(array){this.array=array;}},Mesh:class{constructor(geometry){this.geometry=geometry;}}}
  });
  assert.ok(meshes.length);
  const zs=[];
  for(const mesh of meshes)for(let i=0;i<mesh.geometry.position.array.length;i+=3){
    const[x,y,z]=mesh.geometry.position.array.slice(i,i+3);
    assert.ok(y>=19-1e-6&&y<=height(x,z)-.16+1e-6);
    zs.push(z);
  }
  close(Math.max(...zs)-Math.min(...zs),.45);
});

test('garage and rear-roof leaders connect independently without a pipe across the front gable',()=>{
  const { routes } = roof.getRoofDrainageLayout();
  const garage = routes.find(route => route.id === 'D3');
  assert.ok(garage.points.every(point => point[0] > 55.725));
  assert.ok(garage.points[0][1] > 20.2);
  assert.ok(garage.points.at(-1)[1] < 0);
  assert.ok(garage.supportRequired, 'Deep soffit return is not approved construction');
  const rear = routes.find(route => route.id === 'D4');
  close(rear.points[0][1], 9.3 - .08 - 3.5 / 12 + .025 - (27.5 - 7.475) / 192);
  const upperStep = routes.find(route => route.id === 'D8');
  assert.ok(upperStep.points[0][1] > 27.8);
  assert.ok(upperStep.points[1][2] - .125 > 27.5, 'High leader bypasses the lower gutter rather than crossing through it');
  assert.notDeepEqual(upperStep.points, rear.points);
});
