'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const base=require('../assets/js/floor-plan-roof.js');
const studies=require('../assets/js/roof-design-studies.js');

test('historical roof studies do not mutate the adopted roof and A preserves archived planes',()=>{
  const before=base.getConnectedRoofDefinitions();
  assert.deepEqual(studies.definitions(base,'A'),base.getHistoricalRoofDefinitions());
  studies.definitions(base,'B');studies.definitions(base,'C');
  assert.deepEqual(base.getConnectedRoofDefinitions(),before);
  assert.throws(()=>studies.definitions(base,'other'),/Unknown roof study/);
});

for(const alternative of ['A','B','C','D'])test(`${alternative} retains all roof footprints with unique clipped top coverage`,()=>{
  const definitions=studies.definitions(base,alternative);
  assert.deepEqual(definitions.map(d=>[d.id,d.bounds]),base.getHistoricalRoofDefinitions().map(d=>[d.id,d.bounds]));
  const envelope=base.buildRoofEnvelope(definitions);
  let seed=931;
  for(let i=0;i<3000;i++){
    seed=seed*16807%2147483647;const x=-1+seed/2147483647*58;
    seed=seed*16807%2147483647;const z=1+seed/2147483647*54;
    const expected=definitions.filter(d=>x>d.bounds[0]&&x<d.bounds[1]&&z>d.bounds[2]&&z<d.bounds[3])
      .map(d=>Math.min(...d.planes.map(p=>base.heightAt(p,[x,z]))));
    const faces=envelope.faces.filter(f=>base.contains(f.polygon,[x,z]));
    assert.equal(faces.length,expected.length?1:0);
    if(faces.length)assert.ok(Math.abs(base.heightAt(faces[0].plane,[x,z])-Math.max(...expected))<1e-5);
  }
});

test('reduced attic hips preserve the ceiling envelope and lower roofs use the selected garage',()=>{
  for(const alternative of ['B','C']){
    const library=studies.library(base,alternative),definitions=library.getConnectedRoofDefinitions(10);
    const attic=definitions.find(d=>d.id==='Garage attic storage roof');
    assert.equal(attic.planes.length,4);
    for(const x of [attic.bounds[0],attic.bounds[1]])for(const z of [attic.bounds[2],attic.bounds[3]])
      assert.ok(Math.min(...attic.planes.map(p=>base.heightAt(p,[x,z])))-0.16>=20.5-1e-6);
    const garage=definitions.find(d=>d.id==='Garage front gable');
    assert.deepEqual(library.getLowerRoofDefinitions().find(d=>d.id===garage.id),garage);
  }
});

test('B and C replace the tall service apron with a lower linking roof rather than masking it',()=>{
  const height=definition=>Math.max(...base.buildRoofEnvelope([definition]).faces.flatMap(f=>f.polygon.map(p=>base.heightAt(f.plane,p))));
  const original=base.getHistoricalRoofDefinitions().find(d=>d.id==='Garage service return');
  assert.ok(height(original)>22);
  for(const alternative of ['B','C']){
    const link=studies.definitions(base,alternative).find(d=>d.id===original.id);
    assert.equal(link.planes.length,4);
    assert.ok(height(link)<12);
    assert.deepEqual(link.bounds,original.bounds);
  }
});

test('D joins the compact attic hip to the garage without exposing a blank wall or cutting loft headroom',()=>{
  const definitions=studies.definitions(base,'D');
  const attic=definitions.find(d=>d.id==='Garage attic storage roof');
  const link=definitions.find(d=>d.id==='Garage service return');
  for(let step=0;step<=20;step++){
    const x=attic.bounds[0]+(attic.bounds[1]-attic.bounds[0])*step/20;
    const at=[x,attic.bounds[3]];
    const roof=Math.min(...attic.planes.map(p=>base.heightAt(p,at)));
    assert.ok(Math.abs(roof-base.heightAt(link.planes[0],at))<1e-6);
    assert.ok(roof-0.16>=20.5-1e-6);
  }
  assert.ok(Math.abs(base.heightAt(link.planes[0],[50,link.bounds[3]])-8.9)<1e-6);
  const control=base.getHistoricalRoofDefinitions();
  for(const name of ['Main house','West front gable','East front gable','Garage front gable'])
    assert.deepEqual(definitions.find(d=>d.id===name),control.find(d=>d.id===name));
});
