'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../assets/js/floor-plan-ground.js');

test('low-set fireplace keeps the ember bed and every flame inside the lowered firebox', () => {
  class Group {
    constructor() { this.children = []; }
    add(child) { this.children.push(child); }
  }
  class Shape {
    moveTo() {}
    bezierCurveTo() {}
    closePath() {}
  }
  class Mesh {
    constructor() {
      this.rotation = {};
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.scale = { set() {} };
    }
  }
  const scene = new Group();
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  const fireboxBottom ='), source.indexOf('  const mantel =')), {
    scene, fireplaceFaceX: 1.38, livingCenterZ: 17.475, black: {},
    THREE: { Group, Shape, Mesh, ShapeGeometry: class {}, MeshStandardMaterial: class {}, MeshBasicMaterial: class {} },
    box(parent, x, y, z, w, h, d) {
      const mesh = { x, y, z, w, h, d };
      parent.add(mesh);
      return mesh;
    }
  });
  const [firebox, ember, flames] = scene.children;
  assert.equal(firebox.y - firebox.h / 2, 1);
  assert.equal(firebox.y + firebox.h / 2, 2.25);
  assert.ok(Math.abs(firebox.d * 12 - 55.2) < 1e-9);
  assert.equal(firebox.userData.clearanceVerified, false);
  assert.ok(ember.y - ember.h / 2 > 1);
  assert.equal(flames.children.length, 34);
  for (const flame of flames.children) {
    assert.ok(Math.abs(flame.position.y - 1.265) < 1e-9);
    assert.ok(flame.position.y + 0.68 < 2.25);
  }
});

test('Christmas tree stays in the actual northwest living corner for every seating option', () => {
  class Group {
    constructor() {
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
  }
  const { getGroundFloorDefaultPlan } = require('../assets/js/floor-plan-ground.js');
  const roots = [];
  const context = { THREE: { Group }, livingFeatureWall: getLivingRoomFeatureLayout(), scene: { add(root) { roots.push(root); } } };
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  const christmasTree =');
  const end = source.indexOf('  const evergreen =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const hall = getGroundFloorDefaultPlan().rooms.find((room) => room.name === 'Hall');
  const tree = roots[0];
  assert.equal(roots.length, 1);
  assert.equal(tree.name, 'Living northwest-corner Christmas tree');
  assert.equal(tree.position.x, 2.175);
  assert.ok(Math.abs(tree.position.z - 11.225) < 1e-9);
  assert.equal(tree.position.y, 0);
  assert.equal(tree.userData.heightInches, 84);
  assert.equal(tree.userData.diameterInches, 36);
  assert.equal(tree.userData.seasonal, true);
  assert.ok(tree.position.x + 1.5 < hall.x, 'Entire tree is outside the hallway');
  assert.ok(Math.abs(tree.position.x - 1.5 - 0.175 - 0.5) < 1e-9);
  assert.ok(Math.abs(tree.position.z - 1.5 - getLivingRoomFeatureLayout().wallStartZ - 0.5) < 1e-9);
  assert.match(source, /branches\.userData\.tourObstacle = true/);
  assert.match(source, /treeCross\.position\.y = 6\.82/);
  assert.equal(source.match(/christmasTree\.position/g).length, 1, 'No seating option moves the tree');
});

test('seasonal move preserves all branches, stand, lights, ornaments and seven-foot cross', () => {
  class Part {
    constructor() {
      this.children = [];
      this.userData = {};
      this.rotation = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(part) { this.children.push(part); }
  }
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const roots = [];
  function solid(parent, x, y, z, w, h, d) {
    const part = new Part();
    part.position.set(x, y, z);
    part.dimensions = [w, h, d];
    parent.add(part);
    return part;
  }
  const context = {
    THREE: { Group: Part, Mesh: Part, SphereGeometry: class {}, MeshBasicMaterial: class {} },
    livingFeatureWall: getLivingRoomFeatureLayout(), scene: { add(part) { roots.push(part); } },
    mat() {}, walnut: {}, brass: {},
    cylinder(parent, x, y, z, radius, height) { return solid(parent, x, y, z, radius * 2, height, radius * 2); },
    box: solid
  };
  vm.runInNewContext(source.slice(source.indexOf('  const christmasTree ='), source.indexOf('  function livingWeaveTexture(')), context);
  const tree = roots[0];
  const branches = tree.children.filter(p => p.name === 'Christmas tree branches');
  assert.equal(branches.length, 8);
  assert.ok(branches.every(p => p.userData.tourObstacle), 'Every branch remains a tour obstacle');
  assert.equal(branches[0].dimensions[0], 3);
  const stand = tree.children.find(p => p.name === 'Tree stand basket');
  assert.deepEqual(stand.dimensions, [0.84, 0.9, 0.84]);
  assert.equal(tree.children.filter(p => p.name === 'Warm white tree light').length, 48);
  assert.equal(tree.children.filter(p => p.name === 'Muted gold tree ornament').length, 24);
  const cross = tree.children.find(p => p.name === 'Christmas tree cross');
  assert.equal(cross.rotation.y, Math.PI / 2);
  assert.equal(cross.position.y + cross.children[0].dimensions[1] / 2, 7);
  // Full nominal branch envelope: finished faces plus six inches on both axes.
  assert.ok(Math.abs(tree.position.x - branches[0].dimensions[0] / 2 - 0.175 - 0.5) < 1e-9);
  assert.ok(Math.abs(tree.position.z - branches[0].dimensions[2] / 2 - getLivingRoomFeatureLayout().wallStartZ - 0.5) < 1e-9);
});

test('viewer no longer downloads the removed living alternates, while the licensed library keeps them', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  for (const asset of ['modern_arm_chair_01', 'GlamVelvetSofa', 'side_table_01']) {
    assert.ok(!source.includes(asset), `${asset} is not loaded by the viewer`);
  }
  assert.doesNotMatch(source, /armchairGeometry|sofaGeometry|sideTableGeometry|champagneMaterial/);
  for (const name of ['Crate & Barrel Lounge Deep 105-inch Leather Grande Sofa reference', 'U-shaped double-chaise sectional concept', 'Upholstered lounge chair',
    'Poly Haven textured armchair', 'Wayfair Glam velvet sofa', 'Family-of-five living-room furnishings', 'Deep L-shaped family sectional']) {
    assert.ok(!source.includes(name), `${name} is deleted, not hidden`);
  }
  assert.ok(fs.existsSync(require.resolve('../assets/models/khronos/GlamVelvetSofa.glb')), 'Library file stays on disk');
  const manifest = JSON.parse(fs.readFileSync(require.resolve('../assets/models/manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
  const asset = manifest.assets.find((entry) => entry.id === 'khronos/glam-velvet-sofa');
  assert.equal(asset.license, 'CC-BY-4.0');
  assert.match(asset.attribution, /Wayfair.*Eric Chadwick/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.doesNotMatch(html, /data-living-choice|living-layout-options/);
});
