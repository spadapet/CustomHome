'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

test('service-door constituent trim fits west corner and lands on the two finished levels', () => {
  class Group {
    constructor() {
      this.children = []; this.userData = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { y: 0 };
    }
    add(c) { this.children.push(c); c.parent = this; }
    getWorldPosition(t) { t.y = this.position.y + (this.parent?.position.y ?? 0); return t; }
  }
  const context = { THREE: { Group, Vector3: class {} }, walls: [], windowTrim: {},
    box(parent, x, y, z, w, h, d) {
      const m = new Group(); m.position.set(x, y, z); Object.assign(m, { w, h, d }); parent.add(m); return m;
    } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const casingSideWidth ='), source.indexOf('  const baseTrimSections =')), context);
  for (const side of [-1, 1]) {
    const root = new Group();
    const bottom = side === -1 ? 0.0405 : -0.625;
    context.openingCasing(root, 39.5, 0, 3, 8, 0.175, side, false, { sideWidth: 2.5 / 12, legBottom: bottom });
    const casing = root.children[0];
    for (const m of casing.children) {
      // Reversed face reflects x; symmetric composition has identical outer limits.
      const left = 39.5 + m.position.x - m.w / 2;
      assert.ok(left >= 37.7187499, m.name);
      if (m.name === 'White casing side board') {
        assert.ok(Math.abs(m.position.y - m.h / 2 - bottom) < 1e-8);
        assert.ok(Math.abs(m.position.y + m.h / 2 - (8 + 0.125 / 12)) < 1e-8);
        assert.equal(m.w * 12, 2.5);
      }
    }
    const cap = casing.children.find(m => m.name === 'White casing projecting cap');
    assert.ok(Math.abs((39.5 + cap.position.x - cap.w / 2 - 37.675) * 12 - 0.525) < 1e-8);
  }
  // Ordinary doors retain their shared wide Craftsman profile.
  const root = new Group();
  context.openingCasing(root, 0, 0, 3, 8, 0.175);
  assert.equal(root.children[0].userData.sideWidthInches, 3.5);
});
