'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(require.resolve(`../${file}`), 'utf8');

test('viewer removes both editors without removing saved layout loading or viewing tools', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  assert.doesNotMatch(html, /upstairs-designer|ground-designer|designer-save-status/);
  assert.doesNotMatch(source, /createUpstairsDesigner|designer-open|designer-launch/);
  for (const file of ['upstairs-layout.json', 'ground-layout.json']) assert.ok(source.includes(`fetch('${file}'`));
  for (const control of ['show-floor-grid', 'data-navigation="walk"', 'data-view="upstairs"', 'data-view="exterior"']) assert.ok(html.includes(control));
  for (const id of ['ground-preview-status', 'upstairs-preview-status', 'firepit-storage-note']) assert.match(html, new RegExp(`id="${id}"[^>]*hidden`));
  assert.ok(source.includes("!['exterior-patio', 'exterior-firepit', 'exterior-wood'].includes(name)"));
});

test('night lighting applies to all bathrooms without prematurely selecting a switch product', () => {
  assert.match(read('bathrooms.html'), /Built-in night lighting in every bathroom, including powder rooms and all upstairs bathrooms/);
  assert.match(read('electrical.html'), /every bathroom and powder room on every floor/);
  assert.match(read('electrical.html'), /switch-integrated night light is a candidate, not a selected product/);
});

test('firepit returns to rear cold storage and a narrow wood rack fits beside the waste bins', () => {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.rotation = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { this.children.push(child); }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, geometry, { material }); }
  }
  class CylinderGeometry {
    constructor(top, bottom, height) { this.w = this.d = 2 * Math.max(top, bottom); this.h = height; }
  }
  const group = new Group();
  const context = {
    THREE: { Group, Mesh, CylinderGeometry }, group, dark: {}, stepStone: {}, wood: {},
    box(parent, x, y, z, w, h, d, material) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
  };
  const source = read('floor-plan-exterior.js');
  const start = source.indexOf('  const portableFirepit =');
  const end = source.indexOf('  function exteriorSteps(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const firepit = group.children.find((part) => part.name === 'Portable firepit - rear-yard cold storage only');
  assert.equal(firepit.userData.coldStorageOnly, true);
  assert.equal(firepit.userData.operationApproved, false);
  assert.equal(firepit.userData.useClearanceSatisfied, false);
  assert.equal(firepit.userData.modelSelected, false);
  assert.equal(firepit.userData.localPortableClearanceFeet, 15);
  assert.ok(firepit.children.some((part) => part.name === 'Unlit portable firepit open bowl'));
  assert.ok(firepit.children.some((part) => part.name === 'Portable firepit closed cold-storage lid'));
  assert.equal(firepit.children.filter((part) => part.name === 'Portable firepit foot').length, 4);
  for (const part of firepit.children) {
    const minX = firepit.position.x + part.position.x - part.w / 2;
    const maxX = firepit.position.x + part.position.x + part.w / 2;
    const minZ = firepit.position.z + part.position.z - part.d / 2;
    const maxZ = firepit.position.z + part.position.z + part.d / 2;
    assert.ok(minX >= 38 && maxX <= 42 && minZ >= -17 && maxZ <= -13, 'Firepit is on its rear storage pad, not the front lawn or patio');
    assert.ok(part.position.y - part.h / 2 >= -1e-9, 'Feet rest on paving');
  }
  const rack = group.children.find((part) => part.name === 'Side-yard firewood rack beside waste bins - clearance review required');
  assert.equal(rack.userData.widthFeet, 8);
  assert.equal(rack.userData.depthFeet, 16 / 12);
  assert.equal(rack.userData.localStorageApprovalRequired, true);
  assert.equal(rack.userData.houseSeparationApproved, false);
  assert.ok(rack.position.z + 4.1 < 27.4, 'Rack stops north of the waste-bin pad');
  assert.ok((60.145 - rack.position.x - 0.75) * 12 >= 32, 'Roof does not reduce the paved passage below 32 inches locally');
  assert.ok((60.725 - rack.position.x - 0.75) * 12 >= 36, 'At least 36 inches to the modeled fence rail at the rack');
  const pad = group.children.find((part) => part.name === 'Firewood rack infill pad beside existing walkway');
  assert.ok(pad.position.x + pad.w / 2 <= 56.645, 'New pad stops at the existing walk instead of adding a coplanar overlapping slab');
  assert.ok(group.children.every((part) => part.position.z < 54.2), 'No firepit, rack or associated pads remain in the front yard');
  assert.equal(rack.children.filter((part) => part.name === 'Seasoned firewood placeholder').length, 112);
  assert.match(read('patio.html'), /Do not operate the firepit under (this|the patio) roof/);
});
