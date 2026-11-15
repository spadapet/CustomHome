'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
function harness() {
  class Group { constructor() { this.children = []; this.userData = {}; } add(o) { this.children.push(o); } }
  const meshes = [];
  return {
    THREE: { Group }, group: new Group(), trim: {}, baseBrick: {}, porchColumnFinish: {}, meshes, wallThickness: 0.45,
    frontShift: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().extension,
    box(parent, x, y, z, w, h, d) {
      const mesh = { x, y, z, w, h, d, min: [x-w/2,y-h/2,z-d/2], max: [x+w/2,y+h/2,z+d/2] };
      meshes.push(mesh); parent.add(mesh); return mesh;
    }
  };
}
test('retained entry columns carry a straight entablature: no portal piers, imposts or curved members', () => {
  const c = harness();
  c.brickBox = c.box;
  vm.runInNewContext(source.slice(source.indexOf('  const entryPortal ='), source.indexOf('  const porchCanopyHeight =')), c);
  assert.equal(c.meshes.length, 0, 'Portal pier jackets, stone feet and imposts are removed');
  const portal = c.group.children[0];
  assert.equal(portal.name, 'Straight entry entablature - support concept');
  assert.equal(portal.userData.straightBeam, true);
  assert.equal(portal.userData.curvedMembers, false);
  assert.doesNotMatch(source, /Entry portal (stone foot|masonry pier jacket|impost)|Segmental entry canopy arch/);
});
test('upper brick constituents border rather than fill actual glazing; cornice fits below wall head', () => {
  const c = harness();
  c.brickBox = c.box;
  c.brickSoldierBox = c.box;
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('  function articulateUpperMasonry('),source.indexOf('  const win =')),c);
  c.parent = new c.THREE.Group();
  vm.runInContext('articulateUpperMasonry(parent,31,19,[{center:4.8,width:2.4,sill:13,height:5}])',c);
  // Courses (bed molding broken by the soldier head), rowlock sill, soldier head,
  // two brick jamb returns and the warm cream sill/head trim; every piece starts at the brick face (z 0.225).
  assert.equal(c.meshes.length,11);
  for (const o of c.meshes) {
    assert.ok(o.max[0] <= 3.6+1e-8 || o.min[0] >= 6-1e-8 || o.max[1]<=13 || o.min[1]>=18,
      `${o.name} must not cover the glazing aperture`);
    assert.ok(o.max[1] <= 19);
    assert.ok(Math.abs(o.min[2] - 0.225) < 1e-9, `${o.name} bears on, not inside, the brick face`);
  }
  assert.equal(c.meshes.filter(o=>o.name.startsWith('Cornice')).length,4);
});
