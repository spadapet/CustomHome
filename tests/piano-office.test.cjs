'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');

test('straight kids boundary retains refrigeration and coordinated nonzero floor strips', () => {
  const plan = ground.getGroundFloorDefaultPlan();
  const north = plan.walls.find(([name]) => name === 'Kids north');
  assert.deepEqual(north.slice(1, 5), [19, 26.9, 27.75, 26.9]);
  assert.equal(plan.walls.some(([name]) => name === 'Kids east return'), false);
  for (const name of ['Kitchen south left', 'Kids kitchen return']) {
    const wall = plan.walls.find(([n]) => n === name);
    assert.equal(wall[2], north[2]);
    assert.equal(wall[4], north[2]);
  }
  const floors = plan.floors.filter(({room}) => room === 'Kids room');
  assert.ok(floors.every(({z,d}) => z === 26.9 && Math.abs(z+d-37.2)<1e-9));
  assert.ok(Math.abs(floors.reduce((sum,{w,d})=>sum+w*d,0)-125.66)<1e-9);
  assert.ok(plan.floors.every(({w,d})=>w>0&&d>0));
});

test('redirect restores the single unchanged piano to the pre-straight-wall stair pose', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const piano = { position: { set(x,y,z) { Object.assign(this,{x,y,z}); } }, rotation: {}, userData: {} };
  const start = source.indexOf('  scene.add(piano);');
  const end = source.indexOf('\n', source.indexOf('  piano.userData.location =', start));
  const stairOpening = require('../assets/js/upstairs-layout.js').stairOpening(10);
  vm.runInNewContext(source.slice(start,end), {piano, stairOpening, scene:{add(){}}, pianoDepth:411/304.8});
  assert.equal((source.match(/const piano = new THREE.Group/g)||[]).length,1);
  assert.ok(Math.abs(piano.position.x-3.758333333333333)<1e-9);
  assert.ok(Math.abs(piano.position.z-26.259120734908137)<1e-9);
  assert.equal(piano.rotation.y,Math.PI);
  assert.ok(Math.abs((piano.userData.wallRun.faceZ-piano.position.z-411/304.8/2)*12-1)<1e-9);
  assert.equal(piano.userData.wallRun.windowShiftInches,16);
  assert.doesNotMatch(source,/familyBoard.position.y = 14 \/ 12/);
  assert.match(source,/bottomInches: 30/);
  assert.match(source,/pianoBench.position.set\(0, 0, 0.75\)/);
});
