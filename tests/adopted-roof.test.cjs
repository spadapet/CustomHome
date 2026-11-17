'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const roof=require('../assets/js/floor-plan-roof.js');
const upper=require('../assets/js/floor-plan-upstairs.js');
const ground=require('../assets/js/floor-plan-ground.js');
const layout=require('../assets/js/upstairs-layout.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} should equal ${b}`);

test('adopted November 17 geometry repeats three matching gables across the common roof',()=>{
  const definitions=roof.getConnectedRoofDefinitions();
  const main=definitions.find(d=>d.id==='Main house');
  close(Math.min(...main.planes.map(p=>roof.heightAt(p,[15.6,30.6]))),29.58125);
  const garage=definitions.find(d=>d.id==='Garage room-in-roof');
  [36.075,50.425,30.6,54.55].forEach((value,index)=>close(garage.bounds[index],value));
  close(Math.min(...garage.planes.map(p=>roof.heightAt(p,[43.25,49]))),27.775);
  assert.deepEqual(roof.getGarageEyebrowDefinitions(),[]);
  for(const gable of definitions.filter(d=>/front gable/.test(d.id)||d.id==='Garage room-in-roof')){
    close(gable.bounds[1]-gable.bounds[0],14.35);
    close(gable.bounds[3],54.55);
    assert.equal(gable.planes.length,2);
    close(Math.abs(gable.planes[0][0]),1);
  }
  const extension=definitions.find(d=>d.id==='Main garage extension');
  close(extension.bounds[1],56.2);
  close(extension.bounds[3]-49.225,5.325);
  assert.equal(roof.getGarageAtticWindows().length,2);
  assert.ok(!definitions.some(d=>/storage roof|service return|Garage hip/.test(d.id)));
});

test('the common roof covers the entire retained loft with nine-foot ceiling and no low-side area exclusion',()=>{
  const section=roof.getFinishedLoftSection(),loft=upper.getUpstairsLoftGeometry();
  assert.deepEqual(section.breaks,[]);
  close(section.heightAt(loft.x),9);
  close(section.heightAt(49),9);
  close(section.heightAt(55.5),9);
  close(section.eastLimitAtHeight(5),55.5);
  assert.deepEqual(roof.getFinishedLoftAreaExclusions(),[]);
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  const boundary=[[loft.x,loft.z],[loft.x+loft.w,loft.z],[loft.x+loft.w,loft.z+loft.d],[loft.x,loft.z+loft.d]];
  let area=0;
  for(const face of envelope.faces){
    const clipped=roof.intersectPolygons(face.polygon,boundary);
    area+=Math.abs(roof.signedArea(clipped));
    for(const point of clipped)assert.ok(roof.heightAt(face.plane,point)>=20.5-1e-6,'Reserve 18 inches above a 9-ft ceiling at floor y10');
  }
  close(area,loft.w*loft.d);
  const plan=upper.getUpstairsDefaultPlan(layout.stairOpening());
  const complete={...plan,floors:[...plan.floors,plan.arrival]};
  const raw=ground.getLivableFloorArea(complete,{includeStairs:true});
  const adjusted=ground.getLivableFloorArea({...complete,areaExclusions:roof.getFinishedLoftAreaExclusions()},{includeStairs:true});
  close(raw,adjusted);
});

test('rear roof remains below the unchanged bedroom windows and the patio roof ends at the upper face',()=>{
  const g=upper.getUpstairsMeasuredGeometry(),definitions=roof.getConnectedRoofDefinitions();
  const garage=definitions.find(d=>d.id==='Garage room-in-roof'),rear=definitions.find(d=>d.id==='Garage rear metal lean-to');
  for(const[name,x,z,width]of upper.getUpstairsSideWindows().filter(w=>/^Bedroom 2 east/.test(w[0]))){
    assert.ok(z+width/2<garage.bounds[2],name);
    assert.ok(roof.heightAt(rear.planes[0],[rear.bounds[0],z])<12,name);
  }
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'),'utf8');
  const start=source.indexOf('function getLivingPatioCanopyFrame('),end=source.indexOf('// Masonry stop',start);
  const context={getUpstairsMeasuredGeometry:upper.getUpstairsMeasuredGeometry,prismMasonrySolid:()=>({})};
  vm.runInNewContext(source.slice(start,end),context);
  const frame=context.getLivingPatioCanopyFrame(.45,ground.getLivingRoomFeatureLayout().returnWallZ);
  close(frame.front,g.north-.225);
  const oldCenter=(-.325+9.275)/2,oldY=9.5+1.05*(3/16)/2;
  close(frame.undersideAt(0),oldY-oldCenter*(3/16)-.18/(2*Math.cos(Math.atan(3/16))));
});

test('tour can use the retained loft footprint below the new nine-foot ceiling without affecting downstairs',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const start=source.indexOf('  function canWalkAt('),end=source.indexOf('  function findWalkStart(',start);
  assert.ok(start>0&&end>start);
  const context={activeFloor:'upstairs',getUpstairsLoftGeometry:upper.getUpstairsLoftGeometry,HomeRoof:roof,
    upstairs:{group:{userData:{elevationFeet:10}}},walkHeight:5.4,walkRadius:.5,garageRise:.625,
    walkElevationAt:()=>10,walkObstacles:[],THREE:{MathUtils:{clamp:(n,a,b)=>Math.max(a,Math.min(n,b))}}};
  vm.runInNewContext(source.slice(start,end),context);
  assert.equal(context.canWalkAt(44,31.3),true);
  assert.equal(context.canWalkAt(55,34),true);
  context.activeFloor='ground';
  assert.equal(context.canWalkAt(55,34),true,'The upstairs ceiling restriction must not affect the downstairs garage');
});
