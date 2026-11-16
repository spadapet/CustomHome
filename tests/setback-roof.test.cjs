'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const roof=require('../assets/js/floor-plan-roof.js');
const upper=require('../assets/js/floor-plan-upstairs.js');
test('old loft transition is removed and roof abutments follow the Version H service edge',()=>{
  assert.deepEqual(roof.getSetbackRoofDefinitions(),[]);
  const g=upper.getUpstairsMeasuredGeometry();
  const expected=[g.east+.225,7-.225,g.east+.225,(g.atticNorth+g.atticSouth)/2-.225,
    27.525,g.north-.225,g.east+.225,g.north-.225];
  assert.equal(roof.getSetbackAbutments().flat().length,expected.length);
  roof.getSetbackAbutments().flat().forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-8));
  const envelope=roof.buildRoofEnvelope(roof.getConnectedRoofDefinitions());
  for(const d of roof.getLowerRoofDefinitions().filter(d=>d.id==='Garage room-in-roof')){
    for(const r of upper.getUpstairsDefaultPlan(require('../assets/js/upstairs-layout.js').stairOpening()).rooms){
      const [l,right,n,s]=d.bounds;
      if(r.ceilingProfile==='garage-loft'){
        const section=roof.getFinishedLoftSection();
        const left=Math.max(l,r.x),east=Math.min(right,r.x+r.w),north=Math.max(n,r.z),south=Math.min(s,r.z+r.d);
        if(east>left&&south>north)for(const x of [left,east])for(const z of [north,south]){
          const skin=Math.max(...envelope.faces.filter(f=>roof.contains(f.polygon,[x,z])).map(f=>roof.heightAt(f.plane,[x,z])));
          assert.ok(skin-section.framingReserveFeet>=10+section.heightAt(x)-1e-7,
            `${d.id} clears the actual sloped finished-loft assembly at ${x},${z}`);
        }
        continue;
      }
      const west=Math.max(l,r.x+.175),east=Math.min(right,r.x+r.w-.175);
      const north=Math.max(n,r.z+.175),south=Math.min(s,r.z+r.d-.175);
      if(east>west&&south>north)for(const x of [west,east])for(const z of [north,south]){
        const skin=Math.max(...envelope.faces.filter(f=>roof.contains(f.polygon,[x,z])).map(f=>roof.heightAt(f.plane,[x,z])));
        assert.ok(skin-1.5>=19-1e-7,
          `Visible envelope stays above the nine-foot room and provisional roof zone at ${r.name}/${x},${z}`);
      }
    }
  }
});
test('garage return intersections are clipped to unique highest lower faces',()=>{
  const plan=roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  let samples=0;
  for(let x=31.5;x<56.2;x+=.37)for(let z=41.3;z<49.85;z+=.31){
    const p=[x,z],faces=plan.faces.filter(f=>roof.contains(f.polygon,p));
    assert.equal(faces.length,1,`Unique face at ${p}`);
    const candidates=plan.patches.filter(f=>roof.contains(f.polygon,p));
    assert.ok(Math.abs(roof.heightAt(faces[0].plane,p)-Math.max(...candidates.map(f=>roof.heightAt(f.plane,p))))<1e-6);
    samples++;
  }
  assert.ok(samples>1000);
});
test('remaining east garage closures reach the actual roof underside',()=>{
  const plan=roof.buildRoofEnvelope(roof.getLowerRoofDefinitions());
  for(const segment of roof.wallHeadSegments(plan,[55.5,15],[55.5,49],9)){
    for(const p of [segment.start,segment.end]){
      const faces=plan.faces.filter(f=>roof.contains(f.polygon,[p[0],p[2]]));
      assert.ok(faces.some(f=>Math.abs(roof.heightAt(f.plane,[p[0],p[2]])-.16-p[1])<1e-5));
    }
    assert.equal(segment.bottom,9);
  }
});
test('projection notch clips actual triangles with interpolated roof heights and UVs',()=>{
  const triangles=[[[0,0,0,0,0],[4,0,0,1,0],[4,4,4,1,1]],[[0,0,0,0,0],[4,4,4,1,1],[0,4,4,0,1]]];
  const clipped=roof.trianglesOutsideRectangle(triangles,[2,5,2,5]);
  let area=0;
  for(const triangle of clipped){
    area+=Math.abs(roof.signedArea(triangle.map(p=>[p[0],p[2]])));
    const center=triangle[0].map((_,i)=>triangle.reduce((s,p)=>s+p[i],0)/3);
    assert.ok(center[0]<=2||center[2]<=2);
    for(const p of triangle){assert.equal(p[1],p[2]);assert.equal(p[3],p[0]/4);assert.equal(p[4],p[2]/4);}
  }
  assert.equal(area,12);
});
