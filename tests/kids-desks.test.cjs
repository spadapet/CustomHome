'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildKidsRoom() {
  class Group {
    constructor() {
      this.children = [];
      this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const roots = [];
  const kidsRoom = { x: 19, z: 26.725 - 25 / 12 - 0.08 + 0.175, width: 10 };
  const context = {
    kidsRoom,
    ...Object.fromEntries(['linen', 'cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'brass', 'oak', 'cream', 'porcelain', 'black'].map((name) => [name, { name }])),
    THREE: { Group },
    mat: (color) => ({ color }),
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'All kids-room parts have defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
  const start = source.indexOf('  const kidsClay =');
  const end = source.indexOf('  for (const [index, [deskX, deskZ, rotation]]', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete kids-room furnishings');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, kidsRoom, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, z] = [dx * node.w / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const angle = current.rotation.y;
          [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
          x += current.position.x;
          z += current.position.z;
        }
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x);
        b.minZ = Math.min(b.minZ, z);
        b.maxZ = Math.max(b.maxZ, z);
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return b;
}

test('three compact IKEA MICKE desks use the referenced product dimensions', () => {
  const model = buildKidsRoom();
  const desks = model.roots.filter((item) => item.name.startsWith('IKEA MICKE kids desk '));
  assert.equal(desks.length, 3);
  assert.equal(model.roots.filter((item) => item.name.startsWith('Kids desk chair ')).length, 3);
  assert.equal(model.find('MICKE white desktop').length, 3);
  for (const desk of desks) {
    assert.equal(desk.userData.articleNumber, '302.130.76');
    assert.equal(desk.userData.productURL, 'https://www.ikea.com/us/en/p/micke-desk-white-30213076/');
    const top = desk.children.find((part) => part.name === 'MICKE white desktop');
    assert.ok(Math.abs(top.w * 12 - 28.75) < 1e-9);
    assert.ok(Math.abs(top.d * 12 - 19.625) < 1e-9);
    assert.ok(Math.abs((top.position.y + top.h / 2) * 12 - 29.5) < 1e-9);
    assert.equal(desk.rotation.y, 0);
  }
  for (let index = 1; index < desks.length; index++) {
    assert.ok((bounds(desks[index]).minX - bounds(desks[index - 1]).maxX) * 12 >= 1.24);
  }
});

test('reading and toy storage remain while the small activity table is replaced', () => {
  const model = buildKidsRoom();
  assert.equal(model.find('Kids reading bench')[0].rotation.y, -Math.PI / 2);
  assert.equal(model.find('Kids face-out book display')[0].rotation.y, Math.PI / 2);
  assert.equal(model.find('Kids low toy storage').length, 1);
  assert.equal(model.find('Kids art display board').length, 1);
  assert.equal(model.find('Kids activity table').length, 0);
  assert.equal(model.find('Kids activity stool').length, 0);
  assert.equal(model.find('Kids play rug')[0].userData.widthInches, 78);
});

test('desks, chairs and relocated storage clear room edges and preserve a passage', () => {
  const model = buildKidsRoom();
  const desks = model.roots.filter((item) => item.name.startsWith('IKEA MICKE kids desk ')).map(bounds);
  const chairs = model.roots.filter((item) => item.name.startsWith('Kids desk chair ')).map(bounds);
  const bench = bounds(model.find('Kids reading bench')[0]);
  const books = bounds(model.find('Kids face-out book display')[0]);
  const toys = bounds(model.find('Kids low toy storage')[0]);
  for (const root of model.roots) {
    const b = bounds(root);
    assert.ok(b.minX >= 19.3 && b.maxX <= 28.7 + 1e-9, root.name);
    assert.ok(b.minZ >= model.kidsRoom.z + 0.3 && b.maxZ <= 34.425 + 1e-9, root.name);
  }
  assert.ok(bench.minX > Math.max(...chairs.map((b) => b.maxX)), 'Third chair clears the reading bench');
  assert.ok(bench.maxZ < toys.minZ, 'Bench clears the toy console and pulls');
  assert.ok(books.minZ > 31.5 + (3.5 + 0.125) / 12, 'Book display stays beyond west-entry casing');
  assert.ok(books.maxX < toys.minX, 'Book display clears toy storage');
  const deskFront = Math.max(...desks.map((b) => b.maxZ));
  assert.ok((toys.minZ - deskFront - 30 / 12) * 12 >= 42, 'Over 42 inches remain behind a 30-inch chair-use allowance');
  assert.ok((31.5 - Math.max(...chairs.map((b) => b.maxZ))) * 12 >= 36, 'At least 36 inches of the west entry remains beside modeled chairs');
});
