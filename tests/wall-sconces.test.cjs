'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('decorative sconces default to wall-backed ivory half-oval shades with bounded projection', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  assert.match(source, /function wallSconce\(parent, x, z, rotation, fabricShade = true\)/);
  const positions = [];
  const start = source.indexOf('      const shadePositions =');
  const end = source.indexOf('      const shadeGeometry =', start);
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.points = shadePositions;', positions);
  const points = positions.points;
  const xs = points.filter((_, index) => index % 3 === 0);
  const zs = points.filter((_, index) => index % 3 === 2);
  assert.ok(Math.abs(Math.min(...xs) - 0.01) < 1e-9);
  assert.ok(Math.abs(Math.max(...xs) - 4 / 12) < 1e-9);
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 7.9 / 12) < 1e-9);
  assert.match(source, /color: '#eee4ce'.*side: THREE.DoubleSide/);
});

test('restored kitchen pair uses existing ivory shades outside the full-width window trim', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  class Group {
    constructor() { this.children = []; this.userData = {}; }
    add(part) { this.children.push(part); }
  }
  const shared = require('../floor-plan-ground.js');
  const sconces = [];
  const context = {
    THREE: { Group }, scene: new Group(), kitchenWallLeft: 26.5, kitchenWallRight: 37.5,
    kitchenWindowWallZ: 7, kitchenSinkWindows: shared.getKitchenWindowBankLayout().units,
    wallSconce(parent, x, z, rotation) { sconces.push({ x, z, rotation }); }
  };
  const start = source.indexOf('  const kitchenSconces =');
  const end = source.indexOf('  const glass =', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(sconces.length, 2);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8);
  close(sconces[0].x, 27.311458333333334);
  close(sconces[1].x, 36.688541666666666);
  for (const sconce of sconces) {
    close(sconce.z, 7.205);
    close(sconce.rotation, -Math.PI / 2);
  }
  const capExtension = (3.5 + 0.125 + 0.75) / 12;
  assert.ok(sconces[0].x + 7.9 / 24 < 28.25 - capExtension);
  assert.ok(sconces[1].x - 7.9 / 24 > 35.75 + capExtension);
});
