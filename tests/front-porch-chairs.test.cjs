'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const frontLayout = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout();

test('two cushioned porch seating groups and entry planters meet paving and leave entry approach clear', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const chairs = [];
  class Mesh { constructor(geometry) { this.geometry = geometry; this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; } }
  const context = {
    oak: {}, mat: color => ({ color }),
    groundFrontWallZ: frontLayout.wallZ,
    exteriorFinishes: { gutter: { color: '#41372e' } },
    THREE: { Mesh, SphereGeometry: class { constructor(radius) { this.radius = radius; } } },
    furnishing(name, x, z, rotation, elevation) {
      const chair = { name, x, z, elevation, parts: [], add(mesh) { this.parts.push(mesh); } };
      chairs.push(chair);
      return chair;
    },
    box(parent, x, y, z, w, h, d) {
      const part = { x, y, z, w, h, d, rotation: {} };
      parent.parts.push(part);
      return part;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  const porchCushion ='), source.indexOf("  windowFrame('Office side window'")), context);
  const tables = chairs.filter(item => /small table/.test(item.name));
  const allSeats = chairs.filter(item => /lounge chair/.test(item.name));
  assert.equal(allSeats.length, 4);
  assert.equal(tables.length, 2);
  for (const [group, table] of tables.entries()) {
    const seats = allSeats.slice(group * 2, group * 2 + 2);
    assert.equal(table.x, (seats[0].x + seats[1].x) / 2);
    assert.equal(table.z, seats[0].z);
    assert.ok(table.x - 0.75 > seats[0].x + 1.3);
    assert.ok(table.x + 0.75 < seats[1].x - 1.3);
    for (const leg of table.parts.filter(p => /leg/.test(p.name)))
      assert.ok(Math.abs(table.elevation + leg.y - leg.h / 2 - 0.035) < 1e-8);
    // The east group mirrors the west group about the 15.6 ft entry centerline.
    assert.deepEqual(seats.map(s => s.x), group ? [23.2, 28] : [3.2, 8]);
  }
  for (const chair of allSeats) {
    assert.ok(Math.abs(chair.z - (56.15 + frontLayout.extension)) < 1e-9);
    assert.equal(chair.parts.filter(p => /timber leg/.test(p.name)).length, 4);
    for (const leg of chair.parts.filter(p => /timber leg/.test(p.name)))
      assert.ok(Math.abs(chair.elevation + leg.y - leg.h / 2 - 0.035) < 1e-8);
    assert.equal(chair.parts.filter(p => /outdoor.*cushion/.test(p.name)).length, 2);
    // Conservative full leaf radius envelope around the entire five-foot entry.
    for (const part of chair.parts) {
      const left = chair.x + part.x - part.w / 2;
      const right = chair.x + part.x + part.w / 2;
      assert.ok(right < 10.6 || left > 20.6, 'clear of full entry sweep envelope');
      assert.ok(chair.z + part.z - part.d / 2 > frontLayout.wallZ, 'clear of house wall');
      assert.ok(chair.z + part.z + part.d / 2 <= 57.475 + frontLayout.extension + 1e-8, '44.7-inch front strip retained');
      assert.ok(chair.elevation + part.y + part.h / 2 < 3, 'below the 36-inch porch window sills');
    }
    assert.equal(chair.userData.seatHeightFeet, 1.5);
  }
  const planters = chairs.filter(item => /entry planter/.test(item.name));
  assert.equal(planters.length, 2);
  for (const planter of planters) {
    const body = planter.parts.find(p => p.name === 'Square porch planter');
    const left = planter.x - body.w / 2, right = planter.x + body.w / 2;
    // Outside the entry columns (1 ft shafts on 7/6 ft bases at x 11.65 / 19.55) and the door envelope.
    assert.ok(right <= 11.65 - 7 / 12 - 0.1 || left >= 19.55 + 7 / 12 + 0.1, 'clear of entry column bases');
    assert.ok(right <= 11 || left >= 20.2, 'outside the 9.2 ft clear approach between the entry columns');
    assert.ok(planter.z + body.d / 2 < frontLayout.porchEdgeZ, 'on the porch, not the steps');
  }
});

test('fireplace flanking openings share equal right-reference dimensions', () => {
  const ground = require('../assets/js/floor-plan-ground.js');
  const feature = ground.getLivingRoomFeatureLayout();
  assert.deepEqual(feature.fireplaceWindows, { width: 4, sill: 2.6, height: 5.4, head: 8 });
  const wall = ground.getGroundFloorDefaultPlan().walls.find(w => w[0] === 'Living west');
  assert.ok(wall, 'shared living west wall exists');
  assert.equal(feature.windowCenters.length, 2);
  for (const [left, right, sill, head] of wall[5]) {
    assert.ok(Math.abs(right - left - 4) < 1e-8);
    assert.equal(sill, 2.6);
    assert.equal(head, 8);
  }
});
