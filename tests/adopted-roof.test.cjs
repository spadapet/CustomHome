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

test('adopted geometry matches the approved multi-view sketch dimensions rather than an experimental study',()=>{
  const definitions=roof.getConnectedRoofDefinitions();
  const main=definitions.find(d=>d.id==='Main house');
  close(Math.min(...main.planes.map(p=>roof.heightAt(p,[15.6,30.6]))),26.5875);
  const garage=definitions.find(d=>d.id==='Garage room-in-roof');
  assert.deepEqual(garage.bounds,[30.3,56.2,26.975,49.85]);
  close(Math.min(...garage.planes.map(p=>roof.heightAt(p,[43.25,40]))),25.2916666667);
  const eyebrow=roof.getGarageEyebrowDefinitions()[0];
  assert.deepEqual(eyebrow.bounds,[30.75,55.75,49.225,51.225]);
  close(roof.heightAt(eyebrow.planes[0],[37,49.225]),8.2);
  close(roof.heightAt(eyebrow.planes[0],[37,51.225]),7.7);
  assert.ok(!definitions.some(d=>/storage roof|service return|Garage hip/.test(d.id)));
});

test('loft headroom is a true flat-to-sloped section with stated five/seven/nine-foot limits',()=>{
  const section=roof.getFinishedLoftSection(),loft=upper.getUpstairsLoftGeometry();
  assert.deepEqual(section.breaks,[49]);
  close(section.heightAt(loft.x),9);
  close(section.heightAt(49),9);
  close(section.heightAt(55.5),43/12);
  close(section.eastLimitAtHeight(5),53.8);
  const sevenWidth=section.eastLimitAtHeight(7)-loft.x;
  close(sevenWidth,8.5916666667);
  const exclusion=roof.getFinishedLoftAreaExclusions()[0];
  close(exclusion.w*exclusion.d,25.361875);
  const plan=upper.getUpstairsDefaultPlan(layout.stairOpening());
  const complete={...plan,floors:[...plan.floors,plan.arrival]};
  const raw=ground.getLivableFloorArea(complete,{includeStairs:true});
  const adjusted=ground.getLivableFloorArea({...complete,areaExclusions:[exclusion]},{includeStairs:true});
  close(raw-adjusted,25.361875);
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

test('tour cannot walk through the low side of the loft while its entry remains available',()=>{
  const source=fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'),'utf8');
  const start=source.indexOf('  function canWalkAt('),end=source.indexOf('  function findWalkStart(',start);
  assert.ok(start>0&&end>start);
  const context={activeFloor:'upstairs',getUpstairsLoftGeometry:upper.getUpstairsLoftGeometry,HomeRoof:roof,
    upstairs:{group:{userData:{elevationFeet:10}}},walkHeight:5.4,walkRadius:.5,garageRise:.625,
    walkElevationAt:()=>10,walkObstacles:[],THREE:{MathUtils:{clamp:(n,a,b)=>Math.max(a,Math.min(n,b))}}};
  vm.runInNewContext(source.slice(start,end),context);
  assert.equal(context.canWalkAt(44,31.3),true);
  assert.equal(context.canWalkAt(55,34),false);
  context.activeFloor='ground';
  assert.equal(context.canWalkAt(55,34),true,'The upstairs ceiling restriction must not affect the downstairs garage');
});
