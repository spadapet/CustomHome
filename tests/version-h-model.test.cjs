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

test('active H shell data is unchanged except three measured corner repairs, independent of furnishing implementation', () => {
  // Fingerprint the historical H PLAN DATA, not the entire JS text: the owner
  // now requests new furnishings/operation. This digest was measured from
  // 72474b1's getUpstairsDefaultPlan using the same fixed stair, not the redesign.
  const shell=JSON.parse(JSON.stringify(baseline));
  // Only the newly authorized eastern half-loft is removed for the historical
  // shell fingerprint. The entire November 9 furnished interior stays current.
  shell.rooms=shell.rooms.filter(r=>r.name!=='Finished loft');
  shell.floors=shell.floors.filter(f=>f.room!=='Finished loft');
  shell.walls=shell.walls.filter(w=>!w[0].startsWith('Finished loft '));
  for(const [name,current,original] of [
    ['Laundry west',[[.25,3.25,0,8]],[[0,3,0,8]]],
    ['Laundry south',[[11.825,14.825,0,8]],[[11.95,14.95,0,8]]],
    ['Bedroom 4 north',[[6.95,9.45,0,8],[16,18.5,0,8]],[[6.95,9.45,0,8],[16.25,18.75,0,8]]]
  ]){
    const w=shell.walls.find(w=>w[0]===name);
    w[5].forEach((o,i)=>o.forEach((v,j)=>close(v,current[i][j])));
    w[5]=original;
  }
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(shell)).digest('hex'),
    '9d6ee15fbc0a0e00ab5d5cc1494925ca59baf0c9292083ebd2f494cf80a3c72b');
  assert.ok(fs.existsSync(require.resolve('../assets/images/plans/upstairs-2000/version-i.svg')));
  const g = upper.getUpstairsMeasuredGeometry();
  close(g.east, 42 + 7 / 12); close(g.north, 7.4); close(g.south, 53.8);
  close(g.southClosetSouth, 51.8);
  assert.equal(g.atticEast, 55.5);
  assert.equal(plan.rooms.length, 17);
  assert.equal(plan.rooms.filter(r => /^Bedroom [234]$|^Primary bedroom$/.test(r.name)).length, 4);
  assert.ok(plan.rooms.some(r => r.name === 'Gallery'));
  assert.equal(plan.rooms.filter(r => r.name==='Finished loft').length,1);
  assert.ok(!plan.rooms.some(r => /Hallway/.test(r.name)));
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
  close(ground.getLivableFloorArea({...plan, stairs: baseline.stairs, floors: [...plan.floors, baseline.arrival]}, {includeStairs: true}), 2020.7629166666663);
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
