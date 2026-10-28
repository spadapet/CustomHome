'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout, getWindowProductIntent } = require('../floor-plan-ground.js');

test('living woven shades clear every bay division and leave lower glass exposed on both wall orientations', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() {
      this.children = [];
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { this.children.push(child); }
  }
  const context = { THREE: { Group }, wovenShadeMaterial: {}, wovenShadeEdge: {},
    box(parent, x, y, z, w, h, d) {
      const part = { x, y, z, w, h, d };
      parent.add(part);
      return part;
    } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function addLivingWovenShades('), source.indexOf('  addLivingWovenShades(livingWindowBank,')), context);
  const layout = getLivingRoomFeatureLayout();
  for (const [width, height, sill, columns, side] of [
    [layout.sideWindowBank.width, layout.sideWindowBank.height, layout.sideWindowBank.sill, 3, 1],
    [layout.fireplaceWindows.width, layout.fireplaceWindows.head - layout.fireplaceWindows.sill, 0,
      getWindowProductIntent(layout.fireplaceWindows.width, layout.fireplaceWindows.head - layout.fireplaceWindows.sill).columns, -1]
  ]) {
    const parent = new Group();
    const shades = context.addLivingWovenShades(parent, width, height, sill, columns, 0.075, side);
    assert.equal(shades.children.length, columns);
    assert.equal(shades.userData.cordless, true);
    assert.equal(shades.userData.mountingVerified, false);
    for (const [index, shade] of shades.children.entries()) {
      const panel = shade.children[0];
      assert.ok(Math.abs(panel.h - height * 0.62) < 1e-8);
      assert.ok(shade.userData.lowerGlassExposedFeet > 1);
      assert.ok(shade.position.x - panel.w / 2 > -width / 2 + width * index / columns);
      assert.ok(shade.position.x + panel.w / 2 < -width / 2 + width * (index + 1) / columns);
      assert.ok(side * shade.position.z + 0.09 < 0.075, 'inside reveal, not projecting into room');
      assert.equal(shade.children.length, 3);
    }
  }
});
