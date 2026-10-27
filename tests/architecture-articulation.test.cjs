'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
function harness() {
  class Group { constructor() { this.children = []; this.userData = {}; } add(o) { this.children.push(o); } }
  const meshes = [];
  return {
    THREE: { Group }, group: new Group(), trim: {}, baseBrick: {}, porchColumnFinish: {}, meshes,
    box(parent, x, y, z, w, h, d) {
      const mesh = { x, y, z, w, h, d, min: [x-w/2,y-h/2,z-d/2], max: [x+w/2,y+h/2,z+d/2] };
      meshes.push(mesh); parent.add(mesh); return mesh;
    }
  };
}
test('built portal constituents preserve approach and provide honest lintel depth', () => {
  const c = harness();
  c.brickBox = c.box;
  vm.runInNewContext(source.slice(source.indexOf('  const entryPortal ='), source.indexOf('  const porchCanopyHeight =')), c);
  const feet = c.meshes.filter(o => o.name === 'Entry portal brick foot');
  const shafts = c.meshes.filter(o => o.name === 'Entry portal masonry pier jacket');
  const beam = c.meshes.find(o => o.name === 'Entry portal deep stone entablature');
  assert.ok(Math.abs((feet[1].min[0]-feet[0].max[0])*12-79.8)<1e-8);
  assert.ok(Math.abs((shafts[1].min[0]-shafts[0].max[0])*12-82.8)<1e-8);
  assert.ok(Math.abs(beam.min[1]-8.9)<1e-8);
  assert.ok(Math.abs(beam.max[1]-9.7)<1e-8);
  assert.ok(shafts.every(o=>o.d===1 && o.max[2]===61));
});
test('upper stone constituents border rather than fill actual glazing; cornice fits below wall head', () => {
  const c = harness();
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('  function articulateUpperMasonry('),source.indexOf('  const win =')),c);
  c.parent = new c.THREE.Group();
  vm.runInContext('articulateUpperMasonry(parent,31,19,[{center:4.8,width:2.4,sill:13,height:5}])',c);
  assert.equal(c.meshes.length,8);
  for (const o of c.meshes) {
    assert.ok(o.max[0] <= 3.6+1e-8 || o.min[0] >= 6-1e-8 || o.max[1]<=13 || o.min[1]>=18,
      `${o.name} must not cover the glazing aperture`);
    assert.ok(o.max[1] <= 19);
  }
  assert.equal(c.meshes.filter(o=>o.name.startsWith('Cornice')).length,3);
});
