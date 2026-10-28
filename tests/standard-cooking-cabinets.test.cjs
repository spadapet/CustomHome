'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { y: 0 };
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(callback) { callback(this); this.children.forEach((part) => part.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
}

function build() {
  const context = {
    THREE: { Group, Mesh, TorusGeometry: class {} }, kitchen: new Group(),
    kitchenWallRight: 37.5, cookingWallShiftX: -0.5, cooktopCenterZ: 16.95,
    cooktopRunStartZ: 12.225, cooktopRunEndZ: 21.675, casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12,
    ...Object.fromEntries(['cabinetFinish', 'countertop', 'black', 'steel'].map((name) => [name, {}])),
    box(parent, x, y, z, w, h, d, material) {
      const part = new Mesh({ w, h, d }, material);
      part.position.set(x, y, z);
      parent.add(part);
      return part;
    },
    shakerFront(parent, x, y, z, width, height, rotation = 0) {
      const part = new Group();
      part.position.set(x, y, z);
      part.rotation.y = rotation;
      part.userData = { width, height, cabinetFront: true };
      parent.add(part);
      return part;
    },
    cabinetCupPull(parent, x, y, z) {
      const part = new Group();
      part.name = 'Cup pull';
      part.position.set(x, y, z);
      parent.add(part);
    },
    cabinetPull() {}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function drawerFront('), source.indexOf('  box(kitchen, kitchenSinkX - 3.4,')), context);
  vm.runInContext(source.slice(source.indexOf('  const kitchenCenterZ ='), source.indexOf('  const cooktopHood =')) +
    '\nglobalThis.run = cooktopCabinetry;', context);
  return context;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);
const find = (root, predicate) => {
  const parts = [];
  root.traverse((part) => { if (predicate(part)) parts.push(part); });
  return parts;
};

test('five common-size boxes and equal end fillers exactly fill the fixed cooking run', () => {
  const { run } = build();
  const bodies = find(run, (part) => part.name === 'Standard cooking base cabinet carcass');
  assert.deepEqual(bodies.map((part) => part.userData.nominalWidthInches), [6, 27, 36, 27, 6]);
  close(run.userData.widthInches, 106.15);
  close(run.userData.endFillerWidthInches, 2.075);
  close(102 + 2 * run.userData.endFillerWidthInches, run.userData.widthInches);
  bodies.forEach((body, index) => {
    close(body.geometry.w * 12, 24);
    close(body.userData.nominalHeightInches, 34.5);
    close(body.position.y + body.geometry.h / 2, 34.5 / 12);
    if (index) close(bodies[index - 1].position.z + bodies[index - 1].geometry.d / 2, body.position.z - body.geometry.d / 2);
  });
  close(bodies[2].position.z, 16.95);
});

test('stock-size fronts close the former gaps with one-eighth-inch reveals and useful drawer heights', () => {
  const { run } = build();
  const fronts = find(run, (part) => part.userData.kitchenDrawerRow !== undefined);
  assert.equal(fronts.length, 9);
  const banks = [...new Set(fronts.map((part) => part.parent))];
  assert.equal(banks.length, 3);
  for (const bank of banks) {
    const rows = bank.children.filter((part) => part.userData.kitchenDrawerRow !== undefined);
    rows.forEach((row, index) => {
      const nominal = Math.abs(bank.position.z - 16.95) < 0.001 ? 36 : 27;
      close(row.userData.width * 12, nominal - 0.125);
      close(row.userData.height * 12, index === 2 ? 5.5 : 12.25);
      if (index) close((row.position.y - row.userData.height / 2 - (rows[index - 1].position.y + rows[index - 1].userData.height / 2)) * 12, 0.125);
      for (const pull of row.children) assert.ok(pull.position.y + 1.125 / 24 < row.userData.height / 2, 'Cup pull fits within the shallow front');
    });
  }
  assert.equal(find(run, (part) => part.name === 'Drawer-bank fixed upper rail').length, 0, 'No broad strip masks custom-size gaps');
  assert.equal(find(run, (part) => part.userData.narrowStorageRole).length, 2);
  const lowerFronts = find(run, (part) => part.userData.narrowStorageRole || part.userData.kitchenDrawerRow === 0);
  const edges = lowerFronts.map((part) => {
    const center = part.userData.narrowStorageRole ? part.position.z : part.parent.position.z;
    return { min: center - part.userData.width / 2, max: center + part.userData.width / 2 };
  });
  for (let index = 1; index < edges.length; index++) close((edges[index].min - edges[index - 1].max) * 12, 0.125);
});

test('true 24-inch boxes meet the finished wall and keep the countertop top and cooking centerline', () => {
  const { run } = build();
  const bodies = find(run, (part) => part.name === 'Standard cooking base cabinet carcass');
  for (const body of bodies) close(run.position.x + body.position.x + body.geometry.w / 2, 37.325);
  const counter = find(run, (part) => part.name === 'Extended cooktop quartz counter')[0];
  close(run.position.x + counter.position.x + counter.geometry.w / 2, 37.325);
  close(run.position.x + counter.position.x - counter.geometry.w / 2, 35.2);
  close(counter.position.y + counter.geometry.h / 2, 3.05);
  close(counter.position.y - counter.geometry.h / 2, 34.5 / 12);
  close(counter.geometry.d * 12, 106.15);
});
