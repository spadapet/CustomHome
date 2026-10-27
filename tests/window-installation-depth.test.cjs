'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

// Focused datum-solver tests. Actual THREE constituent geometry on the served
// full house is checked separately by window-flush-geometry.js.
class Vector3 {
  constructor(x, y, z) { Object.assign(this, { x, y, z }); }
  transformDirection(matrix) {
    const { x, z } = this, c = Math.cos(matrix.rotation), s = Math.sin(matrix.rotation);
    this.x = c * x + s * z; this.z = -s * x + c * z;
    return this;
  }
  multiplyScalar(scale) { this.x *= scale; this.y *= scale; this.z *= scale; return this; }
}
const context = { THREE: { Vector3 }, windowWallDatums: [] };
vm.runInNewContext(source.slice(source.indexOf('  function windowFaceDepth('), source.indexOf('  function openingCasing(')), context);
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);

for (const elevation of [0, 10]) for (const rotation of [0, -Math.PI / 2]) for (const side of [-1, 1]) {
  test(`finished face resolves actual offset, elevation ${elevation}, rotation ${rotation}, side ${side}`, () => {
    const nx = Math.sin(rotation) * side, nz = Math.cos(rotation) * side;
    const wall = Math.abs(nx) > 0.5
      ? { x1: 0, z1: -10, x2: 0, z2: 10, thickness: 0.35 }
      : { x1: -10, z1: 0, x2: 10, z2: 0, thickness: 0.35 };
    for (const offset of [-0.1, 0, 0.1]) {
      const parent = {
        matrixWorld: { rotation: 0 },
        updateWorldMatrix() {},
        localToWorld(vector) { vector.x += nx * offset; vector.y += elevation; vector.z += nz * offset; return vector; }
      };
      const face = context.windowFaceDepth(parent, 0, 3, rotation, side, [wall]);
      close(face, 0.175 - offset);
      const frameFace = offset + face - 0.5;
      close(frameFace, -0.325);
      close(offset + face - frameFace, 0.5);
    }
  });
}
test('bank parent rotation participates in the wall-normal calculation', () => {
  const parent = {
    matrixWorld: { rotation: -Math.PI / 2 },
    updateWorldMatrix() {},
    localToWorld(vector) {
      const x = vector.x; vector.x = -vector.z + 0.1; vector.z = x; return vector;
    }
  };
  close(context.windowFaceDepth(parent, 2, 3, 0, -1,
    [{ x1: 0, z1: -10, x2: 0, z2: 10, thickness: 0.35 }]), 0.075);
});
