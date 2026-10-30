'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

// Execute production wall/fence builders; measure their constituent vertices
// through parent rotations, rather than asserting the clearance constant.
function fixture() {
  class Group {
    constructor() {
      this.children = []; this.userData = {}; this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(o) { o.parent = this; this.children.push(o); }
  }
  const group = new Group();
  function box(parent, x, y, z, w, h, d) {
    const o = new Group();
    o.vertices = [-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c => [a*w/2,b*h/2,c*d/2])));
    o.position.set(x,y,z); parent.add(o); return o;
  }
  const context = { group, box, brickBox: box, trim: {}, mat: () => ({}),
    THREE: { Group, BoxGeometry: class {}, InstancedMesh: class extends Group {
      constructor() { super(); this.instanceMatrix = {}; } setMatrixAt() {}
    }, Matrix4: class { makeTranslation() {} } } };
  vm.createContext(context);
  const run = (start, end) => vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
  run('  const wallThickness =', '  const eaves =');
  run('  function wall(', '  // Applied stone');
  vm.runInContext("wall('east ground floor',55.5,49,55.5,7,2.5,9); wall('west ground floor',0,0,0,10,2.5,9);", context);
  vm.runInContext('const westFenceReturnZ=45,eastFenceReturnZ=41;', context);
  run('  const fence = new THREE.Group();', "  fenceRun('West fence return'");
  return { group, lot: vm.runInContext('lot', context) };
}
function bounds(o) {
  const points = [];
  function visit(n) {
    for (let p of n.vertices || []) {
      p = [...p];
      for (let a=n;a;a=a.parent) {
        const c=Math.cos(a.rotation.y), s=Math.sin(a.rotation.y);
        p=[p[0]*c+p[2]*s+a.position.x,p[1]+a.position.y,-p[0]*s+p[2]*c+a.position.z];
      }
      points.push(p);
    }
    n.children.forEach(visit);
  }
  visit(o);
  return { minX: Math.min(...points.map(p=>p[0])), maxX: Math.max(...points.map(p=>p[0])) };
}
test('finished east masonry to innermost fence constituent is six feet with fixed house and parcel width', () => {
  const { group, lot } = fixture();
  const eastWall = bounds(group.children.find(o=>o.name==='Exterior brick wall: east ground floor'));
  const westWall = bounds(group.children.find(o=>o.name==='Exterior brick wall: west ground floor'));
  const fence = group.children.find(o=>o.name==='Cedar rear and side privacy fence');
  const eastFence = bounds(fence.children.find(o=>o.name==='East side fence'));
  const westFence = bounds(fence.children.find(o=>o.name==='West side fence'));
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
  close(eastWall.maxX,55.725); close(eastFence.minX-eastWall.maxX,6);
  const upper = require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry();
  close((upper.east - 55.5) * 12, 3);
  close((eastFence.minX - upper.east - .225) * 12, 69);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /6 ft at ground level, 5 ft 9 in at the measured upper wall/);
  close(lot.right-eastWall.maxX,6.67); close(westWall.minX-lot.left,12.38);
  close(lot.right-lot.left,75); close(lot.front-lot.rear,130);
  close(lot.rearWallZ-lot.rear,32);
  close(eastFence.minX-(lot.right-.5-.75),.58);
  close((lot.left+.5+.75)-westFence.maxX,.625);
});
