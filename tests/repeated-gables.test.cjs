'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const roof = require('../assets/js/floor-plan-roof.js');
const { runExteriorWalls } = require('./exterior-geometry-harness.cjs');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected} ft`);

test('balanced main slopes have equal 23.95-ft runs without raising the adopted ridge', () =>
{
  const definitions = roof.getConnectedRoofDefinitions();
  const main = definitions.find(definition => definition.id === 'Main house');
  const [rear,front] = main.bounds.slice(2),ridgeZ = (rear+front)/2;
  close(ridgeZ,30.6);
  close(ridgeZ-rear,23.95);
  close(front-ridgeZ,23.95);
  assert.equal(main.planes.length,2);
  close(main.planes[0][1],.375);
  close(main.planes[1][1],-.375);
  for(const x of [-.5,15,31])close(Math.min(...main.planes.map(plane=>roof.heightAt(plane,[x,ridgeZ]))),29.58125);
  for(const offset of [0,2,7,12,23.95])
    close(Math.min(...main.planes.map(plane=>roof.heightAt(plane,[15,ridgeZ-offset]))),
      Math.min(...main.planes.map(plane=>roof.heightAt(plane,[15,ridgeZ+offset]))));
  for(const definition of definitions.filter(definition=>['East rear wing','Main garage extension'].includes(definition.id)))
    assert.deepEqual(definition.planes,main.planes);
});

test('three equal gables share one front line while the main roof covers the fixed recessed garage', () =>
{
  const definitions = roof.getConnectedRoofDefinitions();
  const gables = definitions.filter(definition => /front gable/.test(definition.id) || definition.id === 'Garage room-in-roof');
  assert.equal(gables.length, 3);
  for (const definition of gables)
  {
    close(definition.bounds[1] - definition.bounds[0], 14.35);
    close(definition.bounds[3], 54.55);
    assert.equal(definition.planes.length, 2);
    const center = (definition.bounds[0] + definition.bounds[1]) / 2;
    close(Math.min(...definition.planes.map(plane => roof.heightAt(plane, [center, 54]))), 27.775);
  }
  const extension = definitions.find(definition => definition.id === 'Main garage extension');
  close(definitions.find(definition => definition.id === 'Main house').bounds[0], -1);
  close(extension.bounds[1], 56.2);
  close(extension.bounds[3] - 49.225, 5.325);
  const plan = roof.buildRoofEnvelope(definitions);
  for (const join of plan.joins.filter(join => join.type === 'valley'))
    assert.ok(Math.abs(join.start[1] - join.end[1]) > 1e-6, 'No level roof valley');
  const pediment = roof.getGarageFrontPediment();
  assert.equal(pediment.length, 3);
  assert.ok(pediment.every(point => point[2] === 53.8));
  assert.deepEqual(roof.getGarageEyebrowDefinitions(), []);
});

test('garage attic windows are actual wall openings above unchanged garage doors, not painted glazing', () =>
{
  const { walls, group, c, materials } = runExteriorWalls();
  const wallCall = walls.find(wall => wall[0] === 'garage front');
  assert.deepEqual(wallCall.slice(1,5), [31.2,49,55.5,49]);
  close(wallCall[6], 19);
  const doors = wallCall[7].filter(opening => opening.door);
  assert.deepEqual(doors.map(opening => [opening.center,opening.width,opening.sill,opening.height]),
    [[5.8,9,-1.25,8],[17.3,9,-1.25,8]]);
  const windows = roof.getGarageAtticWindows();
  assert.deepEqual(windows.map(window => [window.x,window.z,window.width,window.sill,window.height]),
    [[41.25,49,3,13,5],[45.25,49,3,13,5]]);
  const wall = group.children.find(part => part.name === 'Exterior brick wall: garage front');
  const bricks = wall.children.filter(part => part.material === materials.brick);
  for (const window of windows)
  {
    const center = window.x - 31.2;
    for (const x of [center-1,center,center+1]) for (const y of [13.5,14.4,15,17.5])
      assert.ok(!bricks.some(part => x > part.x-part.w/2+1e-6 && x < part.x+part.w/2-1e-6 &&
        y > part.y-part.h/2+1e-6 && y < part.y+part.h/2-1e-6), `Window opening clear at ${x},${y}`);
  }
  assert.equal(c.windowInstallations.length, 2);
  assert.ok(c.windowInstallations.every(window => window.atticOnly && window.units === 1));
  assert.equal(wall.children.filter(part => part.userData.atticOnly).length, 2);
  const betweenDoors = 11.8;
  assert.ok(bricks.some(part => betweenDoors > part.x-part.w/2 && betweenDoors < part.x+part.w/2 &&
    5 > part.y-part.h/2 && 5 < part.y+part.h/2), 'Keep masonry between the original doors');
});
