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
  const start = source.indexOf('  const storageAccessSteps =');
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

test('guarded access steps stop below the goods deck and require truck/bikes cleared', () => {
  const model = buildEquipment();
  const steps = model.roots[0];
  assert.equal(steps.visible, false, 'No fixed stair obstruction in the parking layout');
  assert.equal(steps.userData.standingHeightFeet, 3.5);
  assert.ok(steps.userData.nominalHeadroomInches >= 80);
  assert.equal(steps.userData.requiresTruckAndBikesRemoved, true);
  assert.equal(steps.userData.walkOnStorageDeck, false);
  assert.equal(steps.userData.engineered, false);
  assert.equal(steps.userData.parkedLocationSelected, false);
  assert.equal(model.find('Garage access non-slip tread').length, 5);
  assert.equal(model.find('Garage access standing platform, not storage deck').length, 1);
  assert.equal(model.find('Garage access continuous handrail').length, 2);
  assert.equal(model.find('Garage access locking caster allowance').length, 4);
  assert.equal(model.find('Garage access closed riser').length, 6);
  assert.equal(model.find('Garage access stair guard baluster').length, 30);
  const platformGuards = model.find('Garage access platform guard').filter((part) => part.position.x > 0).sort((a, b) => a.position.z - b.position.z);
  for (let i = 1; i < platformGuards.length; i++) assert.ok((platformGuards[i].position.z - platformGuards[i - 1].position.z - 0.06) * 12 < 4);
  assert.ok(source.includes('bikeRack.visible = !accessingStorage'));
  assert.ok(source.includes('sierra.visible = !accessingStorage'));
  assert.ok(source.includes("currentView === 'storage-access'"));
});
