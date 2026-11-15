'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ground = require('../assets/js/floor-plan-ground.js');

test('open kids wall kitchen face aligns with refrigeration carcass face and retains fixed kitchen returns', () => {
  const plan = ground.getGroundFloorDefaultPlan();
  const north = plan.walls.find(([name]) => name === 'Kids north');
  assert.deepEqual(north[5], [[1.875, 6.875, 0, 8]]);
  const face = ground.getKitchenRefrigerationLayout().bodyFaceZ;
  // Nov 15: refrigeration carcass bears on the kitchen wall face (26.725) with no setback into the wall.
  assert.ok(Math.abs(face - (26.725 - 25 / 12)) < 1e-9);
  assert.equal(plan.walls.some(([name]) => name === 'Kids east return'), false);
  for (const name of ['Kitchen south', 'Kids kitchen return']) {
    const wall = plan.walls.find(([n]) => n === name);
    assert.equal(wall[2], 26.9);
    assert.equal(wall[4], 26.9);
  }
  const floors = plan.floors.filter(({room}) => room === 'Kids room');
  assert.ok(Math.abs(floors[0].z - 0.175 - face) < 1e-9, 'Kitchen paint face of the 4.2-in wall is flush with the cabinet face');
  assert.ok(floors.every(({z,d}) => Math.abs(z+d-ground.getGuestSuiteLayout().kidsSouthZ)<1e-9));
  assert.equal(floors[1].z, 26.9);
  assert.ok(plan.floors.every(({w,d})=>w>0&&d>0));
});

test('living piano, bench, materials, lamp and lifecycle references are removed; guest remains', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  assert.doesNotMatch(source, /\b(?:pianoBench|pianoWidth|pianoDepth|pianoHeight|rosewood|keyWhite|keyBlack)\b/);
  assert.doesNotMatch(source, /\bpiano\s*[,.=)]|CLP-825|Piano music|Piano lamp support/);
  assert.match(source, /const guestPianoLayout = guestSuite.piano;/);
  assert.match(source, /Guest piano provisional 24 x 12 inch bench/);
  assert.match(source, /YDP-145/);
  assert.ok(ground.getGroundFloorDefaultPlan().walls.some(([name]) => name === 'Piano recess back'));
  assert.doesNotMatch(source,/familyBoard.position.y = 14 \/ 12/);
  assert.doesNotMatch(source,/furnishing\('Family glass dry-erase and cork board'/);
});
