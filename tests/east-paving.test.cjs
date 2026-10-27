'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
function fixture(old = false) {
  class Group { constructor() { this.children = []; this.userData = {}; } add(o) { this.children.push(o); } }
  const c = { THREE: { Group }, group: new Group(), paving(parent, name, x, z, width, depth, top = -1.35) {
    const m = { name, x, z, width, depth, top }; parent.add(m); return m;
  }};
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('  const wallThickness ='), source.indexOf('  const eaves =')), c);
  vm.runInContext(source.match(/  const garageSideDoorCenterZ = [^\n]+/)[0] + source.match(/  const garageSideDoorWidth = [^\n]+/)[0] + source.match(/  const westFrontWindowCenterZ = [^\n]+/)[0] + source.match(/  const westFrontWindowWidth = [^\n]+/)[0], c);
  vm.runInContext('const drivewayLeft=30.9, drivewayWidth=25;', c);
  let code = source.slice(source.indexOf('  const paths = new THREE.Group();'), source.indexOf('  const patioConnectorX ='));
  if (old) code = code.replace(/  \/\/ Owner photo:[\s\S]*?  paths.userData.placement = [^\n]+\n/, '');
  vm.runInContext(code, c);
  vm.runInContext(source.slice(source.indexOf('  const cartWidth ='), source.indexOf('  const trashCans =')), c);
  if (old) vm.runInContext("addWalk('Old rack pad',55.825,17.75,.82,8.5);", c);
  return vm.runInContext('({pieces:paths.children, strip:paths.userData.eastStrip, pocket:paths.userData.westPorchPocket, lot})', c);
}
const area = pieces => pieces.reduce((sum,p)=>sum+p.width*p.depth,0);
test('east strip is completely and uniquely paved at the original datum; fence/property and parcel unchanged', () => {
  const { pieces, strip:s, lot } = fixture();
  assert.equal(s.right-s.left,6); assert.equal(s.rear,7); assert.equal(s.front,52.5);
  assert.equal(s.areaSquareFeet,273); assert.ok(s.right<lot.right);
  assert.equal(lot.right-lot.left,75); assert.equal(lot.front-lot.rear,130);
  for(let x=s.left+.025;x<s.right;x+=.11) for(let z=s.rear+.025;z<s.front;z+=.13) {
    const hits=pieces.filter(p=>x>p.x&&x<p.x+p.width&&z>p.z&&z<p.z+p.depth);
    assert.equal(hits.length,1,`${x},${z}`); assert.equal(hits[0].top,-1.35);
  }
  for(let i=0;i<pieces.length;i++) for(let j=i+1;j<pieces.length;j++){
    const a=pieces[i],b=pieces[j];
    assert.ok(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<1e-8 ||
      Math.min(a.z+a.depth,b.z+b.depth)-Math.max(a.z,b.z)<1e-8,'duplicate top');
  }
});
test('west porch pocket has exact bounded unique coverage without paving the open front lawn', () => {
  const { pieces, pocket:p } = fixture();
  for (const [key,value] of Object.entries({left:-7.855,right:-.225,rear:54.2,front:64.5,topFeet:-1.35,areaSquareFeet:78.589})) {
    assert.ok(Math.abs(p[key]-value)<1e-9, key);
  }
  const infill=pieces.filter(m=>m.name==='West porch pocket paver infill');
  assert.equal(infill.length,1);
  assert.ok(Math.abs(area(infill)-78.589)<1e-9);
  for(let x=p.left+.01;x<p.right;x+=.13) for(let z=p.rear+.01;z<p.front;z+=.13) {
    const hits=pieces.filter(m=>x>m.x&&x<m.x+m.width&&z>m.z&&z<m.z+m.depth);
    assert.equal(hits.length,1); assert.equal(hits[0].top,-1.35);
  }
  assert.ok(infill.every(m=>m.x>=p.left&&m.x+m.width<=p.right+1e-9&&m.z>=p.rear&&m.z+m.depth<=p.front));
});
test('exact union addition excludes prior walkway, door connection, cart and rack pads', () => {
  const current=fixture(), old=fixture(true);
  const added=area(current.pieces)-area(old.pieces);
  console.log(`East paving net addition: ${added.toFixed(6)} sq ft; full strip: 273 sq ft`);
  assert.ok(Math.abs(added-85.4835)<1e-8);
  for(const name of ['West fence-edge walkway','Rear fence-edge walkway','Front paver walk west of driveway']) {
    assert.deepEqual(current.pieces.filter(p=>p.name===name),old.pieces.filter(p=>p.name===name));
  }
});
