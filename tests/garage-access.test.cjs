'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildEquipment() {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.rotation = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(part) { this.children.push(part); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  class Mesh extends Group {}
  const roots = [];
  const context = {
    THREE: { Group, Mesh, TorusGeometry: class {} }, garageFloorY: -1.25, ceilingHeight: 9,
    steel: {}, black: {}, linen: {}, oak: {}, mat() { return {}; },
    furnishing(name, x, z, rotation, elevation) {
      const group = new Group();
      group.name = name;
      group.position.set(x, elevation, z);
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d });
      parent.add(part);
      return part;
    },
    cylinder(parent, x, y, z, radius, h) { return this.box(parent, x, y, z, radius * 2, h, radius * 2); },
    stairBeam(name, from, to, w, d, material, parent) {
      const part = new Group();
      Object.assign(part, { name, from, to });
      parent.add(part);
      return part;
    }
  };
  context.cylinder = (parent, x, y, z, radius, h) => context.box(parent, x, y, z, radius * 2, h, radius * 2);
  const start = source.indexOf('  const yardTools =');
  const end = source.indexOf('  yardTools.traverse(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const all = [];
  roots.forEach((root) => root.traverse((part) => all.push(part)));
  return { roots, find: (name) => all.filter((part) => part.name === name) };
}

test('mower remains on four wheels with its full-length handle unfolded and no upright rotation', () => {
  const model = buildEquipment();
  const mower = model.find('Conventional floor-parked lawn mower')[0];
  assert.equal(mower.userData.foldedHandle, false);
  assert.equal(mower.userData.uprightStorageRequired, false);
  assert.equal(mower.userData.wheelsOnFloor, true);
  assert.ok(mower.children.every((part) => part.rotation.x !== Math.PI / 2));
  assert.equal(model.find('Unfolded mower handle').length, 2);
  assert.equal(model.find('Unfolded mower handle grip')[0].position.z, 3.25);
  assert.equal(model.find('Leaf blower dedicated wall-mount cradle').length, 1);
  assert.equal(model.find('Wall-hung battery leaf blower')[0].userData.wallMounted, true);
});

test('over-bike lift and its retrieval steps are removed without removing the floor bike rack', () => {
  const model = buildEquipment();
  assert.equal(model.find('Garage access standing platform, not storage deck').length, 0);
  assert.doesNotMatch(source, /bikeStorage|storageAccessSteps|storage-access|Over-bike seasonal storage bin/);
  assert.match(source, /furnishing\('Five-bike roll-in floor rack'/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.doesNotMatch(html, /show-bike-storage|data-view="storage-access"|data-view="bike-storage"|Prep\/mudroom divider moved 6 inches/);
  for (const file of ['kitchen.html', 'mud-room.html']) {
    assert.doesNotMatch(fs.readFileSync(require.resolve(`../${file}`), 'utf8'), /October 23 divider|closed oven-handle clearance 43\.3/);
  }
});

test('truck remains in the right bay while parking alignment and BMW rear clearance improve', () => {
  const vehicles = [];
  const start = source.indexOf("  const sierra = vehicle(");
  const end = source.indexOf('  for (const x of [32.5,', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { vehicle(name, x, z, length, width, mirrors) { vehicles.push({ name, x, z, length, width, mirrors }); } });
  const truck = vehicles.find((car) => car.name === 'GMC Sierra EV'), bmw = vehicles.find((car) => car.name === 'BMW i4');
  assert.equal(truck.x, (44 + 53) / 2, 'Align truck with its right-hand nine-foot garage opening');
  assert.equal(truck.length, 233.42, 'No shrinking truck dimensions to manufacture a clearance');
  assert.equal(bmw.length, 188.5);
  assert.equal(bmw.z, 40, 'BMW moves six inches farther into the garage');
  assert.ok((48.825 - bmw.z - bmw.length / 24) * 12 >= 11.6, 'BMW gains six inches behind, rather than remaining under six inches from the rear wall');
  assert.ok((bmw.z - bmw.length / 24 - 29.105) * 12 >= 36, 'Retain at least three feet ahead to the vacuum/bin projections in the parking lane');
  assert.ok((truck.x - truck.mirrors / 24 - bmw.x - bmw.mirrors / 24) * 12 >= 49, 'Center mirror aisle gains six inches');
  assert.ok((55.325 - truck.x - truck.mirrors / 24) * 12 >= 34, 'Truck retains side-wall mirror clearance');
  assert.ok((truck.x - truck.width / 24 - 42.5) * 12 >= 30, 'Truck body gains separation from the mudroom steps');
});
