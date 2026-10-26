'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function build() {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { this.children.push(child); }
  }
  const context = {
    THREE: { Group }, kitchen: new Group(), kitchenSinkX: 32, kitchenSinkRunZ: 8.2,
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'black', 'steel'].map((name) => [name, name])),
    box(parent, x, y, z, w, h, d, material) {
      const part = { x, y, z, w, h, d, material };
      parent.add(part);
      return part;
    },
    shakerFront(parent, x, y, z, w, h) {
      const part = { name: 'front', x, y, z, w, h };
      parent.add(part);
      return part;
    },
    cabinetPull() {}
  };
  vm.runInNewContext(source.slice(source.indexOf('  const trayCabinet ='), source.indexOf('  const trash =')), context);
  return context.kitchen.children[0];
}

test('tray cabinet replaces only the right sink-wall drawer bay with a hollow carcass', () => {
  const cabinet = build();
  assert.equal(cabinet.position.x, 36.4);
  assert.equal(cabinet.position.z, 8.2);
  assert.equal(cabinet.userData.widthInches, 21.6);
  assert.equal(cabinet.children.filter((part) => part.name === 'Tray cabinet side').length, 2);
  assert.ok(!source.includes('[kitchenSinkX + 4.4, 1.65]'));
  assert.ok(!source.includes('[kitchenSinkX + 4.4, 1.8]'));
});

test('pull-out starts closed, travels 21 inches along z and retains five clear slots', () => {
  const cabinet = build();
  const pullout = cabinet.children.find((part) => part.name === 'Kitchen vertical tray pull-out');
  const operation = pullout.userData.interactiveHouseDoor;
  assert.equal(operation.open, false);
  assert.equal(operation.axis, 'z');
  assert.equal(operation.closedCenterX, 0);
  assert.equal(operation.openCenterX * 12, 21);
  const dividers = pullout.children.filter((part) => part.name === 'Vertical tray divider');
  assert.equal(dividers.length, 6);
  const goods = pullout.children.filter((part) => part.name.startsWith('Stored '));
  assert.equal(goods.length, 5);
  for (const item of goods) {
    assert.ok(item.y + item.h / 2 < 2.8 - 0.03125);
    assert.ok(item.d / 2 < 0.8);
    for (const divider of dividers) assert.ok(Math.abs(item.x - divider.x) > (item.w + divider.w) / 2);
  }
  assert.match(source, /door\.position\[operation\.axis \?\? 'x'\]/);
});
