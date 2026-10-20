'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function buildRoof() {
  class BoxGeometry {
    constructor(w, h, d) {
      const vertices = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x * w / 2, y * h / 2, z * d / 2])));
      this.attributes = { position: { count: vertices.length, getY: (i) => vertices[i][1], getZ: (i) => vertices[i][2], setY: (i, y) => { vertices[i][1] = y; } } };
    }
    computeVertexNormals() {}
  }
  class Mesh {
    constructor(geometry, material) {
      Object.assign(this, { geometry, material, rotation: {}, userData: {} });
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
  }
  const walls = [], meshes = [];
  const context = {
    THREE: { BoxGeometry, Mesh }, wallThickness: 0.45, limestone: {}, patioBounds: { rear: -2.1 }, patioWidth: 29, patioCenterX: 41,
    patio: { add(mesh) { meshes.push(mesh); } },
    group: { add(mesh) { meshes.push(mesh); } },
    texturedBox(parent, x, y, z, w, h, d) {
      const mesh = new Mesh(new BoxGeometry(w, h, d), {});
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    wall(name, x1, z1, x2, z2, bottom, top) { walls.push({ name, x1, z1, x2, z2, bottom, top }); }
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  const patioRoofPitch =');
  const end = source.indexOf('  for (const z of [patioBounds.rear', start);
  assert.ok(start >= 0 && end > start);
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return { walls, meshes, underside: vm.runInContext('patioRoofUndersideAt', context) };
}

test('single sloping patio roof retains its envelope and closes the gap above the nine-foot walls', () => {
  const { walls, meshes, underside } = buildRoof();
  const roof = meshes.find((mesh) => mesh.name === 'Brown-shingle covered patio roof');
  assert.equal(roof.userData.pitch, 3 / 16);
  assert.equal(roof.userData.limits.rear, -2.1);
  assert.equal(roof.userData.limits.front, 10);
  const headwall = walls.find((wall) => wall.name === 'Patio roof raised headwall');
  assert.equal(headwall.bottom, 9);
  assert.ok(headwall.top >= underside(7 + 0.225), 'Wall reaches the underside across its full thickness');
  const upperReturn = walls.find((wall) => wall.name === 'Patio roof upper-wall return');
  assert.equal(upperReturn.x1, 54);
  assert.equal(upperReturn.x2, 55.5);
  assert.ok(upperReturn.top >= underside(10));
});

test('both tapered side closures meet the actual roof slope without extending into patio openings', () => {
  const { meshes, underside } = buildRoof();
  const closures = meshes.filter((mesh) => /tapered closure/.test(mesh.name));
  assert.equal(closures.length, 2);
  for (const mesh of closures) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = mesh.position.y + p.getY(i), z = mesh.position.z + p.getZ(i);
      assert.ok(y >= 9, 'No closure intrudes into doors/windows below the wall head');
      if (y > 9) assert.ok(Math.abs(y - underside(z) - 0.02) < 1e-9, 'Sloped top closes directly against roof underside');
    }
  }
});
