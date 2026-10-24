'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../floor-plan-ground.js');

test('Christmas tree is centered on the shared hallway bounds for every seating option', () => {
  class Group {
    constructor() {
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
  }
  const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
  const roots = [];
  const context = { THREE: { Group }, getGroundFloorDefaultPlan, scene: { add(root) { roots.push(root); } } };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  const christmasTree =');
  const end = source.indexOf('  const evergreen =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const hall = getGroundFloorDefaultPlan().rooms.find((room) => room.name === 'Hall');
  const tree = roots[0];
  assert.equal(roots.length, 1);
  assert.equal(tree.name, 'Hall-center Christmas tree');
  assert.equal(tree.position.x, hall.x + hall.w / 2);
  assert.equal(tree.position.z, hall.z + hall.d / 2);
  assert.equal(tree.position.y, 0);
  assert.equal(tree.userData.heightInches, 84);
  assert.equal(tree.userData.diameterInches, 36);
  assert.equal(tree.userData.seasonal, true);
  assert.ok(tree.position.x - 1.5 > hall.x && tree.position.x + 1.5 < hall.x + hall.w);
  assert.ok(tree.position.z - 1.5 > hall.z && tree.position.z + 1.5 < hall.z + hall.d);
  assert.match(source, /branches\.userData\.tourObstacle = true/);
  assert.match(source, /treeCross\.position\.y = 6\.82/);
  assert.doesNotMatch(source.slice(source.indexOf('  const livingLayouts =')), /christmasTree\.position/);
});

test('textured armchairs retain corner centers and inward angles with uniformly scaled asset proportions', async (t) => {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { y: 0 };
      this.userData = {};
    }
    add(child) { this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const asset = JSON.parse(fs.readFileSync(require.resolve('../assets/models/poly-haven/modern_arm_chair_01/modern_arm_chair_01_1k.gltf'), 'utf8'));
  const accessors = asset.meshes[0].primitives.map((primitive) => asset.accessors[primitive.attributes.POSITION]);
  const size = [0, 1, 2].map((axis) => Math.max(...accessors.map((accessor) => accessor.max[axis])) - Math.min(...accessors.map((accessor) => accessor.min[axis])));
  const width = 32.25 / 12, depth = width * size[2] / size[0], height = width * size[1] / size[0];
  const armchairGeometry = {
    userData: { widthInches: width * 12, depthInches: depth * 12, heightInches: height * 12, uniformScale: true, manufacturerCAD: false },
    clone() {
      const mesh = new Group();
      Object.assign(mesh, { isMesh: true, w: width, h: height, d: depth });
      return mesh;
    }
  };
  const roots = [];
  const context = {
    THREE: { Group }, armchairGeometry, scene: { add(root) { roots.push(root); } },
    livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(),
    box(parent, x, y, z, w, h, d) {
      const mesh = new Group();
      mesh.position.set(x, y, z);
      Object.assign(mesh, { w, h, d });
      parent.add(mesh);
      return mesh;
    }
  };
  context.cylinder = (parent, x, y, z, radius, h) => context.box(parent, x, y, z, radius * 2, h, radius * 2);
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const livingChairWidth ='), source.indexOf('  function loungeChair(')), context);
  vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
  const positions = vm.runInContext('livingLayouts.find((layout) => layout.id === "real-sofa").armchairs', context);
  assert.equal(roots.length, 2);
  const bounds = roots.map((chair, index) => {
    const [x, z, angle] = positions[index];
    assert.equal(chair.userData.widthInches, 32.25);
    assert.equal(chair.userData.depthInches, depth * 12);
    assert.equal(chair.userData.uniformScale, true);
    assert.equal(chair.userData.manufacturerCAD, false);
    assert.equal(chair.children[0].userData.tourObstacle, true, 'Downloaded meshes participate in tour collision checks');
    assert.ok(Math.abs(angle - (index === 0 ? Math.PI / 3 : 2 * Math.PI / 3)) < 1e-9);
    const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const part of chair.children.filter((part) => part.w !== undefined)) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = part.position.x + sx * part.w / 2, pz = part.position.z + sz * part.d / 2;
      const wx = x + px * Math.cos(angle) + pz * Math.sin(angle), wz = z - px * Math.sin(angle) + pz * Math.cos(angle);
      result.minX = Math.min(result.minX, wx); result.maxX = Math.max(result.maxX, wx);
      result.minZ = Math.min(result.minZ, wz); result.maxZ = Math.max(result.maxZ, wz);
    }
    assert.ok((result.minX - 0.175) * 12 >= 5 && (result.minX - 0.175) * 12 <= 7, 'Chair envelope remains within seven inches of the fireplace-side wall');
    assert.ok(result.maxX < 5, 'Keep chair out of the central seating approach');
    return result;
  });

  await t.test('licensed product sofa remains available without removing earlier comparisons', () => {
    const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
    const context = { livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout() };
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
    const layouts = vm.runInContext('livingLayouts', context);
    assert.equal(layouts[0].id, 'reference-lounge');
    assert.equal(layouts[0].recommended, true);
    assert.equal(layouts[0].referenceLounge, true);
    assert.equal(layouts.find((layout) => layout.id === 'family-sectional').familySectional, true);
    assert.equal(layouts[0].downloadedSofa, undefined);
    const earlierFamily = layouts.find((layout) => layout.id === 'family-five');
    assert.equal(earlierFamily.downloadedSofa[0], 10.8);
    assert.equal(layouts.find((layout) => layout.id === 'real-sofa').downloadedSofa[0], 11.25);
    assert.equal(earlierFamily.downloadedSofa[1], getLivingRoomFeatureLayout().centerZ);
    assert.equal(earlierFamily.downloadedSofa[2], -Math.PI / 2);
    assert.equal(layouts[0].sectional, undefined);
    assert.ok(layouts.find((layout) => layout.id === 'double-chaise').sectional);
    assert.equal(layouts.filter((layout) => layout.recommended).length, 1);
    assert.match(source, /sofaTemplate\.scale\.setScalar\(\(86 \/ 12\) \/ sofaSize\.x\)/);
    assert.match(source, /if \(part\.isLight\) part\.visible = false/);
    assert.match(source, /place\(downloadedSofa, layout\.downloadedSofa \?\? null\)/);
    assert.match(source, /downloadedSofa\.traverse\(\(part\) => \{ if \(part\.isMesh\) part\.userData\.tourObstacle = true; \}\)/);
    const manifest = JSON.parse(fs.readFileSync(require.resolve('../assets/models/manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
    const asset = manifest.assets.find((entry) => entry.id === 'khronos/glam-velvet-sofa');
    assert.equal(asset.license, 'CC-BY-4.0');
    assert.match(asset.attribution, /Wayfair.*Eric Chadwick/);
    const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
    assert.doesNotMatch(html, /data-living-choice|living-layout-options/);
    assert.match(fs.readFileSync(require.resolve('../viewer-reference-notes.md'), 'utf8'), /GlamVelvetSofa[\s\S]*CC BY 4\.0/);
  });

  await t.test('family layout provides five planning positions, a correctly scaled soft surface and a 16 inch sofa gap', () => {
    const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
    const context = {
      livingCenterZ: getLivingRoomFeatureLayout().centerZ, livingFeatureWall: getLivingRoomFeatureLayout(),
      familyLiving: {}, sofaGeometry: { userData: { widthInches: 86, depthInches: 40.1944462443542 } },
      sideTableGeometry: { userData: { widthInches: 19.9759485918462, depthInches: 16.343956462759493, heightInches: 20 } }
    };
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('  familyLiving.userData ='), source.indexOf('  scene.add(familyLiving);')), context);
    vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
    const layout = vm.runInContext('livingLayouts.find((layout) => layout.id === "family-five")', context);
    const details = context.familyLiving.userData;
    assert.equal(layout.id, 'family-five');
    assert.equal(layout.familyZone, true);
    assert.equal(details.planningSeats, 5);
    assert.equal(details.sofaPlanningSeats + details.chairPlanningSeats, 5);
    assert.equal(layout.armchairs.length, 2);
    assert.equal(details.comfortVerified, false);
    assert.equal(details.rug.w, 9);
    assert.equal(details.rug.d, 12);
    assert.equal(details.ottoman.d * 12, 48);
    assert.ok(details.ottoman.d * 12 >= 86 / 2 && details.ottoman.d * 12 <= 86 * 2 / 3, 'Ottoman follows the one-half to two-thirds sofa-length guideline');
    const front = layout.downloadedSofa[0] - context.sofaGeometry.userData.depthInches / 24;
    assert.ok(Math.abs((front - details.ottoman.x - details.ottoman.w / 2) * 12 - 16) < 1e-9);
    assert.equal(details.sideTables.length, 2);
    assert.ok(Math.abs((layout.armchairs[0][1] + layout.armchairs[1][1]) / 2 - context.livingCenterZ) < 1e-9);
    assert.equal(layout.armchairs[0][2], Math.PI / 4);
    assert.equal(layout.armchairs[1][2], 3 * Math.PI / 4);
    assert.match(source, /place\(familyLiving, layout\.familyZone \? \[0, 0, 0\] : null\)/);
    assert.match(source, /familyOttoman\.traverse\(\(part\) => \{ if \(part\.isMesh\) part\.userData\.tourObstacle = true/);
  });
  assert.ok((bounds[0].minZ - 8.175) * 12 >= 3 && (bounds[0].minZ - 8.175) * 12 < 5, 'Dining-end chair tucks toward the window return');
  assert.ok((getLivingRoomFeatureLayout().wallEndZ - bounds[1].maxZ) * 12 >= 3 && (getLivingRoomFeatureLayout().wallEndZ - bounds[1].maxZ) * 12 < 5, 'Stair-end chair tucks toward its corner without crossing the guard');
  assert.match(source, /model\.traverse\(\(part\) => \{\s+if \(part\.isMesh\) part\.userData\.tourObstacle = true;/);
  assert.match(source, /armchairTemplate\.scale\.setScalar\(\(32\.25 \/ 12\) \/ armchairSize\.x\)/);
});
