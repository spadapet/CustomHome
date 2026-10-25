const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../upstairs-layout.js');

class Group {
  constructor() {
    this.children = [];
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.userData = {};
  }
  add(child) { this.children.push(child); child.parent = this; }
  updateMatrixWorld() {}
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
}
class CylinderGeometry {
  constructor(top, bottom, length) { this.length = length; }
}
function build() {
  const context = { UpstairsLayout: layout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'floor-plan-upstairs.js'), 'utf8'), context);
  const material = {};
  return context.buildUpstairsModel({ Group, Mesh, CylinderGeometry }, {
    box(parent, x, y, z, w, h, d) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    mat: () => material, wood: material, wallMaterial: material, windowTrim: material,
    oak: material, cream: material, black: material, steel: material, linen: material,
    windowFrame() {}, openingCasing() {}
  }, layout.stairOpening(), 10);
}
const model = build();
const item = (name) => {
  const result = model.group.children.find((child) => child.name === `Upstairs ${name}`);
  assert.ok(result, `${name} exists`);
  return result;
};
function bounds(group) {
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  group.traverse((mesh) => {
    const { w, d } = mesh.geometry ?? {};
    if (w === undefined) return;
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
      let worldX = dx;
      let worldZ = dz;
      for (let node = mesh; node; node = node.parent) {
        const cosine = Math.cos(node.rotation.y);
        const sine = Math.sin(node.rotation.y);
        [worldX, worldZ] = [node.position.x + cosine * worldX + sine * worldZ, node.position.z - sine * worldX + cosine * worldZ];
      }
      result.minX = Math.min(result.minX, worldX);
      result.maxX = Math.max(result.maxX, worldX);
      result.minZ = Math.min(result.minZ, worldZ);
      result.maxZ = Math.max(result.maxZ, worldZ);
    }
  });
  return result;
}

test('upstairs builds without canvas labels and retains navigation destinations', () => {
  assert.equal(model.labels, undefined);
  assert.equal(model.group.children.some((child) => /label/i.test(child.name)), false);
  assert.equal(model.mapLabels.length, model.rooms.length);
});

test('all bedrooms have bedside furniture, lighting and separate dressers', () => {
  for (const name of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4']) {
    const bed = item(`${name} bed`);
    assert.equal(bed.children.filter((mesh) => mesh.geometry.w === 0.8 && mesh.geometry.h === 0.65).length, 2);
    assert.equal(bed.children.filter((mesh) => mesh.geometry.w === 1.55 && mesh.geometry.h === 1.9).length, 2);
    item(`${name} dresser`);
  }
  for (const name of ['Loft reading chair', 'Loft media console', 'Loft coffee table and rug', 'Loft desk chair', 'Laundry wall cupboards']) item(name);
});

test('closets have continuous rods and clothing rather than shelves called rails', () => {
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet return hanging', 'Bedroom 2 closet hanging', 'Bedroom 3 closet hanging', 'Bedroom 4 closet hanging']) {
    const bay = item(name);
    const rods = bay.children.filter((mesh) => mesh.name === 'Continuous hanging rod');
    assert.equal(rods.length, bay.userData.doubleHang ? 2 : 1);
    assert.ok(rods.every((rod) => rod.geometry.length > 3.5));
    assert.ok(bay.children.some((mesh) => mesh.geometry.h === (bay.userData.doubleHang ? 2.6 : 4.8)));
    assert.equal(bay.userData.storageDepthFeet, 2);
  }
});

test('primary closet includes hardware in its 38.4-inch aisle and clears both entries', () => {
  const dresser = bounds(item('Primary closet drawers'));
  const hanging = bounds(item('Primary closet long hanging'));
  assert.ok(Math.abs((hanging.minZ - dresser.maxZ) * 12 - 38.4) < 0.001);
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet folded clothes']) {
    const b = bounds(item(name));
    assert.ok(b.minZ >= 19.6, `${name} clears west entry ending at z=19.2`);
    assert.ok(b.maxZ <= 21.75, `${name} clears south wall trim`);
    assert.ok(b.maxX <= 28.5, `${name} leaves east connecting approach open`);
  }
  assert.ok(bounds(item('Primary closet return hanging')).maxZ < 17.8);
});

test('bedroom 2 toilet no longer overlaps the vanity', () => {
  const toilet = bounds(item('Bedroom 2 toilet'));
  const vanity = bounds(item('Bedroom 2 vanity'));
  assert.ok(toilet.maxZ < vanity.minZ);
});

test('closet inspection reveals hanging contents and other views restore canopy shelves', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('    upstairs.group.traverse((object) => {', source.indexOf('  function setView(name)'));
  assert.ok(start > 0);
  const end = source.indexOf('    const planView', start);
  const canopies = [];
  model.group.traverse((object) => { if (object.userData.closetCanopy) canopies.push(object); });
  assert.equal(canopies.length, 6);
  for (const name of ['upstairs-primary-closet', 'upstairs', 'whole', 'upstairs-bedroom-2-closet', 'upstairs-top']) {
    vm.runInNewContext(source.slice(start, end), { upstairs: model, name });
    assert.ok(canopies.every((object) => object.visible === !name.includes('closet')), name);
  }
});
