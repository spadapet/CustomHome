'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../floor-plan-ground.js');

test('real STRANDMON geometry moves into both corners without shrinking or changing its inward angles', () => {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { y: 0 };
      this.userData = {};
    }
    add(child) { this.children.push(child); }
  }
  const roots = [];
  const context = {
    THREE: { Group, Mesh: Group, SphereGeometry: class {} }, walnut: {}, scene: { add(root) { roots.push(root); } }, mat() { return {}; },
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
  vm.runInContext(source.slice(source.indexOf('  const strandmonWidth ='), source.indexOf('  function loungeChair(')), context);
  vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
  const positions = vm.runInContext('livingLayouts[0].strandmon', context);
  assert.equal(roots.length, 2);
  const bounds = roots.map((chair, index) => {
    const [x, z, angle] = positions[index];
    assert.equal(chair.userData.widthInches, 32.25);
    assert.equal(chair.userData.depthInches, 37.75);
    assert.ok(Math.abs(angle - (index === 0 ? Math.PI / 3 : 2 * Math.PI / 3)) < 1e-9);
    const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const part of chair.children.filter((part) => part.w !== undefined)) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = part.position.x + sx * part.w / 2, pz = part.position.z + sz * part.d / 2;
      const wx = x + px * Math.cos(angle) + pz * Math.sin(angle), wz = z - px * Math.sin(angle) + pz * Math.cos(angle);
      result.minX = Math.min(result.minX, wx); result.maxX = Math.max(result.maxX, wx);
      result.minZ = Math.min(result.minZ, wz); result.maxZ = Math.max(result.maxZ, wz);
    }
    assert.ok((result.minX - 0.175) * 12 >= 5 && (result.minX - 0.175) * 12 <= 7, 'Chair envelope is now within seven inches of the fireplace-side wall, not over two feet away');
    assert.ok(result.maxX < 5, 'Keep chair out of the central seating approach');
    return result;
  });
  assert.ok((bounds[0].minZ - 8.175) * 12 >= 3 && (bounds[0].minZ - 8.175) * 12 < 5, 'Dining-end chair tucks toward the window return');
  assert.ok((getLivingRoomFeatureLayout().wallEndZ - bounds[1].maxZ) * 12 >= 3 && (getLivingRoomFeatureLayout().wallEndZ - bounds[1].maxZ) * 12 < 5, 'Stair-end chair tucks toward its corner without crossing the guard');
});
