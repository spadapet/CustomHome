'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('two cushioned porch chairs meet paving and leave entry approach clear', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const chairs = [];
  const context = {
    oak: {}, mat: color => ({ color }),
    furnishing(name, x, z, rotation, elevation) {
      const chair = { name, x, z, elevation, parts: [] };
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
  const table = chairs.find(item => /small table/.test(item.name));
  const seats = chairs.filter(item => /lounge chair/.test(item.name));
  assert.equal(seats.length, 2);
  assert.ok(table);
  assert.equal(table.x, (seats[0].x + seats[1].x) / 2);
  assert.equal(table.z, seats[0].z);
  assert.ok(table.x - 0.75 > seats[0].x + 1.3);
  assert.ok(table.x + 0.75 < seats[1].x - 1.3);
  for (const leg of table.parts.filter(p => /leg/.test(p.name)))
    assert.ok(Math.abs(table.elevation + leg.y - leg.h / 2 - 0.035) < 1e-8);
  for (const [index, chair] of seats.entries()) {
    assert.equal(chair.x, index ? 8 : 3.2);
    assert.equal(chair.z, 56.15);
    assert.equal(chair.parts.filter(p => /timber leg/.test(p.name)).length, 4);
    for (const leg of chair.parts.filter(p => /timber leg/.test(p.name)))
      assert.ok(Math.abs(chair.elevation + leg.y - leg.h / 2 - 0.035) < 1e-8);
    assert.equal(chair.parts.filter(p => /outdoor.*cushion/.test(p.name)).length, 2);
    // Conservative full leaf radius envelope around the entire five-foot entry.
    for (const part of chair.parts) {
      const left = chair.x + part.x - part.w / 2;
      const right = chair.x + part.x + part.w / 2;
      assert.ok(right < 10.6 || left > 20.6, 'clear of full entry sweep envelope');
      assert.ok(chair.z + part.z - part.d / 2 > 54.2, 'clear of house wall');
      assert.ok(chair.z + part.z + part.d / 2 <= 57.475 + 1e-8, '44.7-inch front strip retained');
    }
    assert.equal(chair.userData.seatHeightFeet, 1.5);
  }
});

test('fireplace flanking openings share equal right-reference dimensions', () => {
  const ground = require('../floor-plan-ground.js');
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
