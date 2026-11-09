'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ground = require('../assets/js/floor-plan-ground.js');
const fs = require('node:fs');
const vm = require('node:vm');

test('living return room face aligns exactly with the kitchen counter front', () => {
  const feature = ground.getLivingRoomFeatureLayout();
  const plan = ground.getGroundFloorDefaultPlan();
  const north = plan.walls.find(([name]) => name === 'Living north');
  const west = plan.walls.find(([name]) => name === 'Living west');
  const dining = plan.walls.find(([name]) => name === 'Dining west');
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
  const counterFront = 7 + 1.2 + 2.05 / 2;
  close(north[2] + 0.175, counterFront);
  close(north[4], feature.returnWallZ);
  close(west[2], feature.returnWallZ);
  close(dining[4], feature.returnWallZ);
  close(feature.sideWindowBank.z, feature.returnWallZ);
  for (const window of feature.sideWindowBank.units) close(window.z, feature.returnWallZ);
  const floor = plan.floors.find((floor) => floor.room === 'Living room');
  close(floor.z, feature.returnWallZ);
  close(floor.z + floor.d, 25.7);
  close(feature.centerZ, 18);
  close(feature.centerZ - feature.wallStartZ, feature.wallEndZ - feature.centerZ);
  close(feature.windowCenters[0] - 2 - feature.wallStartZ, feature.wallEndZ - feature.windowCenters[1] - 2);
  close(feature.patioDoor.z, 3.95);
  close((feature.centerZ - 5.5 - feature.wallStartZ) * 12, 39.3);
  close((feature.returnWallZ - 8) * 12, 12.6);
});

test('stone, firebox, mantel and TV use the actual finished-wall midpoint with equal end margins', () => {
  const feature = ground.getLivingRoomFeatureLayout();
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const parts = [];
  const context = {
    livingCenterZ: feature.centerZ, fireplaceBackingDepth: 1.2, fireplaceBackingFrontX: 1.2,
    fireplaceFaceX: 1.38, ceilingHeight: 9, fireboxBottom: 1, fireboxHeight: 1.25,
    fireplace: {}, scene: {}, mortar: {}, black: {}, cabinetRailFinish: {},
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  };
  for (const selector of [
    /^  box\(fireplace, .*\.name = 'Fireplace stone backing';$/m,
    /^  const firebox = box\(.+$/m,
    /^  const mantel = box\(.+$/m,
    /^  box\(scene, .*\.name = 'Fireplace television';$/m
  ]) {
    const line = source.match(selector);
    assert.ok(line, String(selector));
    vm.runInNewContext(line[0], context);
  }
  assert.equal(parts.length, 4);
  for (const part of parts) {
    assert.ok(Math.abs(part.z - (feature.wallStartZ + feature.wallEndZ) / 2) < 1e-9);
    const north = part.z - part.d / 2 - feature.wallStartZ;
    const south = feature.wallEndZ - part.z - part.d / 2;
    assert.ok(Math.abs(north - south) < 1e-9, 'Equal clear wall lengths on both sides of each feature');
  }
  assert.ok(Math.abs((feature.windowCenters[0] + feature.windowCenters[1]) / 2 - feature.centerZ) < 1e-9);
});
