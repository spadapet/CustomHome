'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const frontLayout = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout();

function planting() {
  class Mesh {
    constructor(geometry) {
      this.geometry = geometry;
      this.scale = { x: 1, y: 1, z: 1, set(x,y,z) { Object.assign(this,{x,y,z}); } };
      this.position = { set(x,y,z) { Object.assign(this,{x,y,z}); } };
      this.children = [];
    }
    add(child) { this.children.push(child); }
  }
  const children = [];
  const group = { add(mesh) { children.push(mesh); } };
  const c = { THREE: { Mesh, SphereGeometry: class { constructor(radius) { this.radius = radius; } } },
    group, mat: () => ({}), drivewayLeft: 30.9,
    frontPorchEdgeZ: frontLayout.porchEdgeZ, frontShift: frontLayout.extension,
    box(parent,x,y,z,w,h,d) {
      const mesh = { position: {x,y,z}, w,h,d };
      parent.add(mesh); return mesh;
    } };
  vm.runInNewContext(source.slice(source.indexOf('  const mulch ='), source.indexOf('  for (const [start, end, z]')),c);
  return children;
}
test('front evergreen constituents no longer overlap and stay within the unchanged beds', () => {
  const all = planting();
  for (const bed of all.filter(o => o.userData?.surface)) {
    const shrubs = all.filter(o => o.name === 'Front mulch-bed shrub' && o.userData.plantingBed === bed.name);
    assert.equal(shrubs.length,5);
    const b = bed.userData.limits;
    shrubs.forEach((s,i) => {
      assert.ok(s.position.x-0.85 >= b.left && s.position.x+0.85 <= b.right);
      assert.ok(s.position.z-0.85 >= b.rear && s.position.z+0.85 <= b.front);
      assert.equal(s.position.y-0.85,bed.userData.topFeet);
      if(i) assert.ok(s.position.x-shrubs[i-1].position.x-1.7 >= 0.25-1e-8);
    });
    const low = all.filter(o => o.name === 'Low front-bed planting mound' && o.userData.plantingBed === bed.name);
    assert.equal(low.length,7);
    for (const s of low) {
      assert.ok(s.position.x-s.scale.x > b.left && s.position.x+s.scale.x < b.right);
      assert.ok(s.position.z+s.scale.z < b.front);
      assert.ok(s.position.z-s.scale.z > shrubs[0].position.z+0.9);
      assert.equal(s.position.y-s.scale.y,bed.userData.topFeet);
    }
    // Nov 15 palette: boxwood and hydrangea shrubs, ornamental grass and low flowering
    // perennials; every plant top stays below the porch floor so windows/columns stay visible.
    assert.deepEqual(shrubs.map(s => s.userData.species.split(' ')[0]), ['Boxwood', 'Hydrangea', 'Boxwood', 'Hydrangea', 'Boxwood']);
    for (const s of shrubs.filter(s => /Hydrangea/.test(s.userData.species))) {
      const bloom = s.children.find(o => o.name === 'Hydrangea bloom cap');
      assert.ok(bloom && bloom.position.y + bloom.geometry.radius <= 0.85 * 1.05 + 1e-9, 'Bloom shell sits just proud of the shrub top');
    }
    assert.ok(low.some(s => s.userData.planting === 'Ornamental grass') && low.some(s => s.userData.planting === 'Low flowering perennial'));
    for (const s of [...shrubs.map(o => ({ top: o.position.y + 0.85 })), ...low.map(o => ({ top: o.position.y + o.scale.y }))]) assert.ok(s.top <= 0.1 + 1e-9, 'At or below porch floor level, under every sill');
  }
});
test('stone edging remains inside existing soil, below the walk, and outside entry/driveway', () => {
  const all = planting();
  const edges = all.filter(o=>o.name?.startsWith('Front planting-bed stone edge'));
  assert.equal(edges.length,6);
  for (const e of edges) {
    assert.ok(e.position.z+e.d/2 <= 64.5+frontLayout.extension+1e-8);
    assert.ok(e.position.y+e.h/2 < -1.35);
    // Beds stop at the 10.8 ft entry steps (x10.2-21.0); no edging, mulch or planting under a tread.
    assert.ok(e.position.x+e.w/2 <= 10.2+1e-8 || e.position.x-e.w/2 >= 21-1e-8);
    assert.ok(e.position.x+e.w/2 <= 30.9+1e-8);
  }
});
