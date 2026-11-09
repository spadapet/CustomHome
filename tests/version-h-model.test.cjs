'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const upper = require('../assets/js/floor-plan-upstairs.js');
const layout = require('../assets/js/upstairs-layout.js');
const ground = require('../assets/js/floor-plan-ground.js');
const baseline = upper.getUpstairsDefaultPlan(layout.stairOpening());
const plan = layout.resolve(baseline, layout.empty());
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('active production upstairs is the verified historical H blob, not the retained I SVG', () => {
  const bytes = Buffer.from(fs.readFileSync(require.resolve('../assets/js/floor-plan-upstairs.js'), 'utf8').replace(/\r\n/g, '\n'));
  const hash = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(hash, 'b16b81ffc3ce2ed65ce6ec928953a25d7daba57b');
  assert.ok(fs.existsSync(require.resolve('../assets/images/plans/upstairs-2000/version-i.svg')));
  const g = upper.getUpstairsMeasuredGeometry();
  close(g.east, 42 + 7 / 12); close(g.north, 7.4); close(g.south, 53.8);
  close(g.southClosetSouth, 51.8);
  assert.equal(g.atticEast, 55.5);
  assert.equal(plan.rooms.length, 16);
  assert.equal(plan.rooms.filter(r => /^Bedroom [234]$|^Primary bedroom$/.test(r.name)).length, 4);
  assert.ok(plan.rooms.some(r => r.name === 'Gallery'));
  assert.ok(!plan.rooms.some(r => /Loft|Hallway/.test(r.name)));
});

test('H furnished openings and exterior cuts coordinate without new attic or loft glazing', () => {
  assert.equal(plan.windows.length, 12);
  assert.equal(plan.windows.reduce((n, w) => n + (w[3] > 3 ? 2 : 1), 0), 17);
  for (const tuple of plan.windows) {
    const vertical = Math.abs(tuple[4]) > 1;
    const host = plan.walls.find(w => {
      if ((Math.abs(w.x1 - w.x2) < 1e-8) !== vertical) return false;
      const normal = vertical ? w.x1 : w.z1;
      const along = vertical ? tuple[2] - w.z1 : tuple[1] - w.x1;
      return Math.abs(normal - (vertical ? tuple[1] : tuple[2])) < .101 &&
        w.openings.some(o => o[2] > 0 && Math.abs((o[0] + o[1]) / 2 - along) < 1e-8 &&
          Math.abs(o[1] - o[0] - tuple[3]) < 1e-8);
    });
    assert.ok(host, tuple[0]);
  }
  const roof = require('../assets/js/floor-plan-roof.js').getConnectedRoofDefinitions();
  assert.ok(roof.some(r => r.id === 'Garage attic storage roof'));
  assert.ok(!roof.some(r => /Loft/i.test(r.id)));
  close(roof.find(r => r.id === 'Dining rear projection').bounds[2], 1.25);
});

test('H area keeps the current ground plan and stair assembly without counting unfinished attic', () => {
  close(ground.getLivableFloorArea({...plan, stairs: baseline.stairs, floors: [...plan.floors, baseline.arrival]}, {includeStairs: true}), 1850.5858333333333);
  close(ground.getLivableFloorArea(ground.getGroundFloorDefaultPlan(), {includeStairs: true}), 1924.3327083333343);
  close(baseline.arrival.w * 12, 44);
  assert.equal(plan.walls.flatMap(w => w.openings.filter(o => o[2] === 0)).length, 16);
  for (const wall of plan.walls) for (const o of wall.openings.filter(o => o[2] === 0)) close(o[3], 8);
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  assert.match(source, /Stepped tops meet every tread underside/);
  assert.match(source, /\[stairRun, landingHeight \+ stairRise\]/);
  close(ground.getLivingRoomFeatureLayout().diningRearZ, 1.9);
  close(ground.getLivingRoomFeatureLayout().returnWallZ + .175, 9.225);
});
